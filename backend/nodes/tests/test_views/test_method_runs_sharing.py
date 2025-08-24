from django.urls import reverse

from nodes.tests import factories
from permissions import utils
from utils.testcases import BaseTransactionTestCase


class MethodNodeRunSharingTestCase(BaseTransactionTestCase):
    def test_share_with_user(self) -> None:
        """Test that a user can share a method run with another user."""
        # Create a method run owned by the owner user
        method_run = factories.MethodNodeRunFactory.create(
            user=self.owner_user, owner=self.owner_user
        )

        # Initially, the viewer user should not be able to access the method run
        response = self.viewer_client.get(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 403)

        # Add the viewer user as a viewer of the method run through the API
        membership_data = {
            "user": self.viewer_user.email,
            "role": utils.get_viewer_role().role,
        }
        response = self.owner_client.post(
            reverse("nodes:method-runs-manage-permissions", args=[method_run.public_id]),
            membership_data,
        )
        self.assertEqual(response.status_code, 201)

        # Now the viewer user should be able to access the method run
        response = self.viewer_client.get(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(method_run.public_id))

        # But the viewer user should not be able to modify the method run
        response = self.viewer_client.patch(
            reverse("nodes:method-runs-detail", args=[method_run.public_id]),
            {"is_public": True},
        )
        self.assertEqual(response.status_code, 403)

    def test_public_method_run(self) -> None:
        """Test that a public method run can be accessed by anyone."""
        # Create a method run owned by the owner user
        method_run = factories.MethodNodeRunFactory.create(
            user=self.owner_user, owner=self.owner_user
        )

        # Initially, the anonymous user should not be able to access the method run
        response = self.client.get(reverse("nodes:method-runs-detail", args=[method_run.public_id]))
        self.assertEqual(response.status_code, 401)

        # Make the method run public through the API
        response = self.owner_client.patch(
            reverse("nodes:method-runs-detail", args=[method_run.public_id]),
            {"is_public": True},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_public"])

        # Now the anonymous user should be able to access the method run
        response = self.client.get(reverse("nodes:method-runs-detail", args=[method_run.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(method_run.public_id))

    def test_owner_can_change_permissions(self) -> None:
        """Test that the owner can change permissions of a method run."""
        # Create a method run owned by the owner user
        method_run = factories.MethodNodeRunFactory.create(
            user=self.owner_user, owner=self.owner_user
        )

        # The owner should be able to make the method run public
        response = self.owner_client.patch(
            reverse("nodes:method-runs-detail", args=[method_run.public_id]),
            {"is_public": True},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_public"])

        # The owner should be able to add a member
        membership_data = {
            "user": self.viewer_user.email,
            "role": utils.get_viewer_role().role,
        }
        response = self.owner_client.post(
            reverse("nodes:method-runs-manage-permissions", args=[method_run.public_id]),
            membership_data,
        )
        self.assertEqual(response.status_code, 201)

        # Verify that the viewer user can now access the method run
        response = self.viewer_client.get(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 200)

    def test_member_cannot_modify_run(self) -> None:
        """Test that a member cannot modify the run data, only permissions."""
        # Create a method run owned by the owner user
        method_run = factories.MethodNodeRunFactory.create(
            user=self.owner_user, owner=self.owner_user, method_data={"key": "value"}
        )

        # Add the member user as a member of the method run through the API
        membership_data = {
            "user": self.member_user.email,
            "role": utils.get_member_role().role,
        }
        response = self.owner_client.post(
            reverse("nodes:method-runs-manage-permissions", args=[method_run.public_id]),
            membership_data,
        )
        self.assertEqual(response.status_code, 201, response.data)

        # The member should not be able to modify the method data
        response = self.member_client.patch(
            reverse("nodes:method-runs-detail", args=[method_run.public_id]),
            {"method_data": {"key": "new_value"}},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        # The member also shouldn't be able to change permissions
        response = self.member_client.patch(
            reverse("nodes:method-runs-detail", args=[method_run.public_id]),
            {"is_public": True},
        )
        self.assertEqual(response.status_code, 403)
