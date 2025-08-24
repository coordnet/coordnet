from django.urls import reverse
from rest_framework import test as drf_test

from nodes.tests import factories
from users.tests import factories as users_factories
from utils.testcases import BaseTransactionTestCase


class MethodNodeVersionsTestCase(BaseTransactionTestCase):
    def test_list(self) -> None:
        response = self.owner_client.get(reverse("nodes:method-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

        method = factories.MethodNodeFactory.create(owner=self.owner_user)

        factories.MethodNodeVersionFactory.create_batch(10, method=method)
        with self.assertNumQueries(3):
            response = self.owner_client.get(reverse("nodes:method-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 10)

    def test_retrieve(self) -> None:
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        method_version = factories.MethodNodeVersionFactory.create(method=method)

        with self.assertNumQueries(3):
            response = self.owner_client.get(
                reverse("nodes:method-versions-detail", args=[method_version.public_id])
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(method_version.public_id))

    def test_create(self) -> None:
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        response = self.owner_client.post(
            reverse("nodes:method-versions-list"),
            {
                "method": method.public_id,
                "method_data": '{"data": 1}',
            },
        )
        self.assertEqual(response.status_code, 201, response.data)

    def test_update(self) -> None:
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        method_version = factories.MethodNodeVersionFactory.create(
            method=method, title="old name", method_data='{"data": 1}', version=1
        )
        response = self.owner_client.patch(
            reverse("nodes:method-versions-detail", args=[method_version.public_id]),
            {
                "title": "new name",
                "method_data": '{"data": 123}',
                "version": 2,
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "old name")
        self.assertEqual(response.data["version"], 1)

        method_version.refresh_from_db()
        self.assertEqual(method_version.method_data, '{"data": 1}')

    def test_delete(self) -> None:
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        method_version = factories.MethodNodeVersionFactory.create(method=method)

        response = self.owner_client.delete(
            reverse("nodes:method-versions-detail", args=[method_version.public_id])
        )
        self.assertEqual(response.status_code, 204)
        method_version.refresh_from_db()
        self.assertTrue(method_version.is_removed)

    def test_execute_permissions(self) -> None:
        """Test that users with read access can execute a method version."""

        # Create a method with the owner user as the owner
        method = factories.MethodNodeFactory.create(owner=self.owner_user)

        # Create a method version for this method
        method_version = factories.MethodNodeVersionFactory.create(
            method=method, version=1, method_data={}
        )

        # Create a method run for the owner
        owner_run = factories.MethodNodeRunFactory.create(
            method=method,
            method_version=method_version,
            user=self.owner_user,
        )

        # The owner should be able to execute the method run
        response = self.owner_client.post(
            reverse("nodes:method-runs-execute", args=[owner_run.public_id]), {}
        )
        self.assertEqual(response.status_code, 204)

        # Create a method run for the viewer
        viewer_run = factories.MethodNodeRunFactory.create(
            method=method,
            method_version=method_version,
            user=self.viewer_user,
        )

        # The viewer should be able to execute the method run
        response = self.viewer_client.post(
            reverse("nodes:method-runs-execute", args=[viewer_run.public_id]), {}
        )
        self.assertEqual(response.status_code, 204)

    def test_execute_permissions_unauthorized(self) -> None:
        """Test what happens if a user doesn't have permissions but knows the UUID."""

        # Create a method with the owner user as the owner
        method = factories.MethodNodeFactory.create(owner=self.owner_user)

        # Create a method version for this method
        method_version = factories.MethodNodeVersionFactory.create(
            method=method, version=1, method_data={}
        )

        # Create an unauthorized user who doesn't have any permissions on the method
        unauthorized_user = users_factories.UserFactory()
        unauthorized_client = drf_test.APIClient()
        unauthorized_client.force_authenticate(user=unauthorized_user)

        # Try to access the method version using its UUID
        response = unauthorized_client.get(
            reverse("nodes:method-versions-detail", args=[method_version.public_id])
        )
        self.assertEqual(response.status_code, 403)

        # Create a method run for the owner user
        owner_run = factories.MethodNodeRunFactory.create(
            method=method,
            method_version=method_version,
            user=self.owner_user,
        )

        # Try to execute the owner's method run with the unauthorized user
        response = unauthorized_client.post(
            reverse("nodes:method-runs-execute", args=[owner_run.public_id]), {}
        )
        # Verify that the request is denied
        self.assertEqual(response.status_code, 403)
