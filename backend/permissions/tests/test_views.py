from django.urls import reverse

from nodes.tests import factories as node_factories
from permissions import models
from utils.testcases import BaseTransactionTestCase


class PermissionViewSetMixinTestCase(BaseTransactionTestCase):
    def test_space_model_view_set(self) -> None:
        """Test that listing the permissions is limited to the owner of the Space."""
        space = node_factories.SpaceFactory.create(owner=self.owner_user)

        response = self.owner_client.get(
            reverse("nodes:spaces-manage-permissions", args=[str(space.public_id)])
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["user"], self.owner_user.email)

        response = self.viewer_client.get(
            reverse("nodes:spaces-manage-permissions", args=[str(space.public_id)])
        )
        self.assertEqual(response.status_code, 403)

        response = self.member_client.get(
            reverse("nodes:spaces-manage-permissions", args=[str(space.public_id)])
        )
        self.assertEqual(response.status_code, 403)

        response = self.owner_client.post(
            reverse("nodes:spaces-manage-permissions", args=[str(space.public_id)]),
            data={"user": self.viewer_user.email, "role": "owner"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"], self.viewer_user.email)

        response = self.viewer_client.get(
            reverse("nodes:spaces-manage-permissions", args=[str(space.public_id)])
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

    def test_adding_and_deleting_permissions(self) -> None:
        """Test that adding and deleting permissions is limited to the owner of the Space."""
        space = node_factories.SpaceFactory.create(owner=self.owner_user)
        object_permission = models.ObjectMembership.objects.get(user=self.owner_user)

        response = self.viewer_client.delete(
            reverse(
                "nodes:spaces-delete-permission",
                kwargs={
                    "public_id": str(space.public_id),
                    "permission_uuid": object_permission.public_id,
                },
            )
        )
        self.assertEqual(response.status_code, 403)

        response = self.member_client.delete(
            reverse(
                "nodes:spaces-delete-permission",
                kwargs={
                    "public_id": str(space.public_id),
                    "permission_uuid": str(object_permission.public_id),
                },
            )
        )
        self.assertEqual(response.status_code, 403)

        response = self.owner_client.delete(
            reverse(
                "nodes:spaces-delete-permission",
                kwargs={
                    "public_id": str(space.public_id),
                    "permission_uuid": str(object_permission.public_id),
                },
            )
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(models.ObjectMembership.objects.filter(user=self.owner_user).exists())

    def test_subnodes_field_on_nodes(self) -> None:
        """Check that we don't use N+1 queries when getting the subnodes for a node."""

        space = node_factories.SpaceFactory.create(owner=self.owner_user)
        node = node_factories.NodeFactory.create(space=space)
        subnodes = node_factories.NodeFactory.create_batch(10, space=space)
        node.subnodes.set(subnodes)
        self.assertEqual(node.subnodes.count(), 10)
        self.assertEqual(space.nodes.count(), 11)

        with self.assertNumQueries(2):
            response = self.owner_client.get(
                reverse("nodes:nodes-detail", args=[str(node.public_id)])
            )
            self.assertEqual(response.status_code, 200)

        response_data = response.json()
        self.assertEqual(len(response_data["subnodes"]), 10)

        with self.assertNumQueries(2):
            response = self.owner_client.get(reverse("nodes:nodes-list"))
            self.assertEqual(response.status_code, 200)

        response_data = response.json()
        self.assertEqual(response_data["count"], 11)

    def test_allowed_actions_on_spaces(self) -> None:
        """Check that we don't use N+1 queries when getting the allowed actions on a space."""

        space = node_factories.SpaceFactory.create_batch(10, owner=self.owner_user)

        with self.assertNumQueries(2):
            response = self.owner_client.get(
                reverse("nodes:spaces-detail", args=[str(space[0].public_id)])
            )
            self.assertEqual(response.status_code, 200)

        response_data = response.json()
        self.assertSetEqual(
            set(response_data["allowed_actions"]), {"read", "write", "manage", "delete"}
        )

        with self.assertNumQueries(2):
            response = self.owner_client.get(reverse("nodes:spaces-list"))
            self.assertEqual(response.status_code, 200)

        response_data = response.json()
        self.assertEqual(response_data["count"], 10)
        for node_data in response_data["results"]:
            self.assertEqual(len(node_data["allowed_actions"]), 4)
            self.assertSetEqual(
                set(node_data["allowed_actions"]), {"read", "write", "manage", "delete"}
            )
