from unittest import mock

from django.contrib.contenttypes.models import ContentType
from django.urls import reverse

import permissions.utils
from nodes import models
from nodes.tests import factories
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
        owner_role = permissions.utils.get_owner_role()

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

    def test_is_owner_field_for_owner(self) -> None:
        """Test that the is_owner field is True when the current user is the owner."""
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)

        response = self.owner_client.get(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_owner"])

    def test_is_owner_field_for_non_owner(self) -> None:
        """Test that the is_owner field is False when the current user is not the owner."""
        # Create a method run owned by the owner user
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)

        # Add the viewer user as a viewer of the method run so they can access it
        from permissions import utils

        method_run.members.create(user=self.viewer_user, role=utils.get_viewer_role())

        # The viewer should see is_owner as False
        response = self.viewer_client.get(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["is_owner"])

    def test_is_owner_field_in_list_view(self) -> None:
        """Test that the is_owner field works correctly in list view."""
        # Create method runs for both users
        owner_run = factories.MethodNodeRunFactory.create(user=self.owner_user)
        viewer_run = factories.MethodNodeRunFactory.create(user=self.viewer_user)

        # Owner should only see their own run with is_owner=True
        response = self.owner_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(owner_run.public_id))
        self.assertTrue(response.data["results"][0]["is_owner"])

        # Viewer should only see their own run with is_owner=True
        response = self.viewer_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(viewer_run.public_id))
        self.assertTrue(response.data["results"][0]["is_owner"])

    def test_user_only_sees_own_runs(self) -> None:
        """Test that users only see their own runs in the list view."""
        # Create runs for different users
        factories.MethodNodeRunFactory.create_batch(3, user=self.owner_user)
        factories.MethodNodeRunFactory.create_batch(2, user=self.viewer_user)

        # Owner should only see their 3 runs
        response = self.owner_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 3)

        # Viewer should only see their 2 runs
        response = self.viewer_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

    def test_own_runs_filter(self) -> None:
        """Test that the own_runs filter parameter works correctly."""
        # Create runs for different users
        factories.MethodNodeRunFactory.create_batch(3, user=self.owner_user)
        factories.MethodNodeRunFactory.create_batch(
            2, user=self.viewer_user, viewer=self.owner_user
        )

        # Test with own_runs=true - should return only user's own runs
        # This should only require 2 queries (one for the runs, one for permissions)
        with self.assertNumQueries(2):
            response = self.owner_client.get(
                reverse("nodes:method-runs-list"), {"own_runs": "true"}
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 3)

        # Test with own_runs=false - should return runs where the user is not the owner but has
        # access to. This should only require 2 queries (one for the runs, one for permissions)
        with self.assertNumQueries(2):
            response = self.owner_client.get(
                reverse("nodes:method-runs-list"), {"own_runs": "false"}
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

        # Test without the filter - should return all runs the user has access to
        # This should only require 2 queries (one for the runs, one for permissions)
        with self.assertNumQueries(2):
            response = self.owner_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 5)

        # Test with viewer user
        # This should only require 2 queries (one for the runs, one for permissions)
        with self.assertNumQueries(2):
            response = self.viewer_client.get(
                reverse("nodes:method-runs-list"), {"own_runs": "true"}
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

    def test_is_public_filter(self) -> None:
        """Test that the is_public filter parameter works correctly."""
        # Create runs with different public settings
        factories.MethodNodeRunFactory.create_batch(2, user=self.owner_user, is_public=True)
        factories.MethodNodeRunFactory.create_batch(1, user=self.owner_user, is_public=False)

        # Test with is_public=true - should return only public runs
        # This should only require 2 queries (one for the runs, one for permissions)
        with self.assertNumQueries(2):
            response = self.owner_client.get(
                reverse("nodes:method-runs-list"), {"is_public": "true"}
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

        # Test with is_public=false - should return only non-public runs
        # This should only require 2 queries (one for the runs, one for permissions)
        with self.assertNumQueries(2):
            response = self.owner_client.get(
                reverse("nodes:method-runs-list"), {"is_public": "false"}
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

        # Test without the filter - should return all runs
        # This should only require 2 queries (one for the runs, one for permissions)
        with self.assertNumQueries(2):
            response = self.owner_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 3)

    def test_own_runs_false_returns_others_runs(self) -> None:
        """Test that own_runs=false returns runs where the user isn't the owner."""
        # Create runs for different users
        owner_runs = factories.MethodNodeRunFactory.create_batch(
            2, user=self.owner_user, is_public=True
        )
        viewer_runs = factories.MethodNodeRunFactory.create_batch(
            3, user=self.viewer_user, is_public=True
        )

        # Give the owner access to viewer's runs
        for run in viewer_runs:
            run.members.create(user=self.owner_user, role=permissions.utils.get_viewer_role())

        # Give the viewer access to owner's runs
        for run in owner_runs:
            run.members.create(user=self.viewer_user, role=permissions.utils.get_viewer_role())

        # Test with own_runs=false for owner - should return viewer's runs
        # This should only require 2 queries (one for the runs, one for permissions)
        with self.assertNumQueries(2):
            response = self.owner_client.get(
                reverse("nodes:method-runs-list"), {"own_runs": "false"}
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 3)

        # Verify that the returned runs are not owned by the owner
        for result in response.data["results"]:
            self.assertFalse(result["is_owner"])

        # Test with own_runs=false for viewer - should return owner's runs
        # This should only require 2 queries (one for the runs, one for permissions)
        with self.assertNumQueries(2):
            response = self.viewer_client.get(
                reverse("nodes:method-runs-list"), {"own_runs": "false"}
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

        # Verify that the returned runs are not owned by the viewer
        for result in response.data["results"]:
            self.assertFalse(result["is_owner"])

    def test_is_shared_field_for_unshared_run(self) -> None:
        """Test that the is_shared field is False when the run is not shared with other users."""
        # Create a run that is not shared with other users
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)

        # The owner should see is_shared as False
        response = self.owner_client.get(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["is_shared"])

    def test_is_shared_field_for_shared_run(self) -> None:
        """Test that the is_shared field is True when the run is shared with other users."""
        # Create a run
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)

        # Share the run with another user
        method_run.members.create(user=self.viewer_user, role=permissions.utils.get_viewer_role())

        # The owner should see is_shared as True
        response = self.owner_client.get(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_shared"])

        # The viewer should also see is_shared as True
        response = self.viewer_client.get(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_shared"])

    def test_is_shared_field_in_list_view(self) -> None:
        """Test that the is_shared field works correctly in list view."""
        # Create runs - one shared, one not shared
        unshared_run = factories.MethodNodeRunFactory.create(user=self.owner_user)
        shared_run = factories.MethodNodeRunFactory.create(user=self.owner_user)

        # Share one run with the viewer
        shared_run.members.create(user=self.viewer_user, role=permissions.utils.get_viewer_role())

        # Owner should see both runs with correct is_shared values
        # This should only require 2 queries (one for the runs, one for permissions)
        with self.assertNumQueries(2):
            response = self.owner_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

        # Find the shared and unshared runs in the response
        shared_run_data = next(
            r for r in response.data["results"] if r["id"] == str(shared_run.public_id)
        )
        unshared_run_data = next(
            r for r in response.data["results"] if r["id"] == str(unshared_run.public_id)
        )

        # Verify is_shared values
        self.assertTrue(shared_run_data["is_shared"])
        self.assertFalse(unshared_run_data["is_shared"])
