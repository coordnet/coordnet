from unittest import mock

from django.contrib.contenttypes.models import ContentType
from django.urls import reverse

from nodes import models
from nodes.tests import factories
from permissions import utils
from permissions.models import ObjectMembership
from utils.testcases import BaseTransactionTestCase


class MethodNodeRunTestCase(BaseTransactionTestCase):
    def test_list(self) -> None:
        response = self.owner_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

        factories.MethodNodeRunFactory.create_batch(10, user=self.owner_user)
        with self.assertNumQueries(2):
            response = self.owner_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 10)

    def test_retrieve(self) -> None:
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)

        with self.assertNumQueries(2):
            response = self.owner_client.get(
                reverse("nodes:method-runs-detail", args=[method_run.public_id])
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(method_run.public_id))

    def test_create(self) -> None:
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        response = self.owner_client.post(
            reverse("nodes:method-runs-list"),
            {
                "method": method.public_id,
                "method_version": factories.MethodNodeVersionFactory.create(
                    method=method
                ).public_id,
                "space": factories.SpaceFactory.create(owner=self.owner_user).public_id,
                "method_data": {"key": "value"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)

    def test_create_assigns_owner_permissions(self) -> None:
        """
        Regression test to verify that creating a method run assigns owner permissions to the
        creator.
        """

        # Create a method and method version
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        method_version = factories.MethodNodeVersionFactory.create(method=method)
        space = factories.SpaceFactory.create(owner=self.owner_user)

        # Create a method run through the API
        response = self.owner_client.post(
            reverse("nodes:method-runs-list"),
            {
                "method": method.public_id,
                "method_version": method_version.public_id,
                "space": space.public_id,
                "method_data": {"key": "value"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)

        # Get the created method run's ID and retrieve the method run object
        method_run_id = response.data["id"]
        method_run = models.MethodNodeRun.objects.get(public_id=method_run_id)

        # Directly verify that the owner has been assigned owner permissions
        content_type = ContentType.objects.get_for_model(models.MethodNodeRun)
        owner_role = utils.get_owner_role()

        # Check if an ObjectMembership exists for the method run and owner user with owner role
        membership_exists = ObjectMembership.objects.filter(
            content_type=content_type,
            object_id=method_run.id,
            user=self.owner_user,
            role=owner_role,
        ).exists()

        self.assertTrue(membership_exists, "Owner permissions were not assigned to the creator")

        # Verify that the owner can access the method run
        response = self.owner_client.get(reverse("nodes:method-runs-detail", args=[method_run_id]))
        self.assertEqual(response.status_code, 200)

        # Verify that the owner can modify the method run (owner-specific action)
        response = self.owner_client.patch(
            reverse("nodes:method-runs-detail", args=[method_run_id]),
            {"is_public": True},
        )
        self.assertEqual(response.status_code, 200)

    def test_update(self) -> None:
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)
        response = self.owner_client.patch(
            reverse("nodes:method-runs-detail", args=[method_run.public_id]),
            {"is_dev_run": True},
        )
        self.assertEqual(response.status_code, 200)

        self.assertFalse(response.data["is_dev_run"])

        response = self.viewer_client.patch(
            reverse("nodes:method-runs-detail", args=[method_run.public_id]),
            {"name": "new name"},
        )
        self.assertEqual(response.status_code, 403)

    def test_delete(self) -> None:
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)
        response = self.viewer_client.delete(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 403)

        response = self.owner_client.delete(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 204)

    @mock.patch("config.celery_app.app.send_task")
    def test_execution(self, mock_send_task: mock.Mock) -> None:
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)
        response = self.owner_client.post(
            reverse("nodes:method-runs-execute", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 204)
        mock_send_task.assert_called_once()

    @mock.patch("config.celery_app.app.send_task")
    def test_execute_permissions(self, mock_send_task: mock.Mock) -> None:
        """Test that users with read access can execute a method run."""
        from rest_framework import test as drf_test

        from permissions import utils
        from users.tests import factories as users_factories

        # Create a method run owned by the owner user
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        method_version = factories.MethodNodeVersionFactory.create(method=method)
        method_run = factories.MethodNodeRunFactory.create(
            method=method,
            method_version=method_version,
            user=self.owner_user,
            owner=self.owner_user,
        )

        # The owner should be able to execute the method run
        response = self.owner_client.post(
            reverse("nodes:method-runs-execute", args=[method_run.public_id]), {}
        )
        self.assertEqual(response.status_code, 204)

        # Add the viewer user as a viewer of the method run
        method_run.members.create(user=self.viewer_user, role=utils.get_viewer_role())

        # The viewer should be able to execute the method run because they have read access
        response = self.viewer_client.post(
            reverse("nodes:method-runs-execute", args=[method_run.public_id]), {}
        )
        self.assertEqual(response.status_code, 204)

        # Create an unauthorized user who doesn't have any permissions on the method run
        unauthorized_user = users_factories.UserFactory()
        unauthorized_client = drf_test.APIClient()
        unauthorized_client.force_authenticate(user=unauthorized_user)

        # The unauthorized user should not be able to execute the method run
        response = unauthorized_client.post(
            reverse("nodes:method-runs-execute", args=[method_run.public_id]), {}
        )
        self.assertEqual(response.status_code, 403)
