from django.urls import reverse

from nodes.tests import factories as node_factories
from permissions import models
from utils.testcases import BaseTransactionTestCase


class PermissionViewSetMixinTestCase(BaseTransactionTestCase):
    def test_node_model_view_set(self) -> None:
        """Test that listing the permissions is limited to the owner of the node."""
        node = node_factories.NodeFactory.create(owner=self.owner_user)

        response = self.owner_client.get(
            reverse("nodes:nodes-manage-permissions", args=[str(node.public_id)])
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["user"], self.owner_user.email)

        response = self.viewer_client.get(
            reverse("nodes:nodes-manage-permissions", args=[str(node.public_id)])
        )
        self.assertEqual(response.status_code, 403)

        response = self.member_client.get(
            reverse("nodes:nodes-manage-permissions", args=[str(node.public_id)])
        )
        self.assertEqual(response.status_code, 403)

        response = self.owner_client.post(
            reverse("nodes:nodes-manage-permissions", args=[str(node.public_id)]),
            data={"user": self.viewer_user.email, "role": "owner"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"], self.viewer_user.email)

        response = self.viewer_client.get(
            reverse("nodes:nodes-manage-permissions", args=[str(node.public_id)])
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

    def test_adding_and_deleting_permissions(self) -> None:
        """Test that adding and deleting permissions is limited to the owner of the node."""
        node = node_factories.NodeFactory.create(owner=self.owner_user)
        object_permission = models.ObjectMembership.objects.get(user=self.owner_user)

        response = self.viewer_client.delete(
            reverse(
                "nodes:nodes-delete-permission",
                kwargs={
                    "public_id": str(node.public_id),
                    "permission_uuid": str(object_permission.public_id),
                },
            )
        )
        self.assertEqual(response.status_code, 403)

        response = self.member_client.delete(
            reverse(
                "nodes:nodes-delete-permission",
                kwargs={
                    "public_id": str(node.public_id),
                    "permission_uuid": str(object_permission.public_id),
                },
            )
        )
        self.assertEqual(response.status_code, 403)

        response = self.owner_client.delete(
            reverse(
                "nodes:nodes-delete-permission",
                kwargs={
                    "public_id": str(node.public_id),
                    "permission_uuid": str(object_permission.public_id),
                },
            )
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(models.ObjectMembership.objects.filter(user=self.owner_user).exists())
