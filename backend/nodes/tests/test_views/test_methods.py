from django.urls import reverse

import permissions.tests.factories as permission_factories
import permissions.utils
from nodes.tests import factories
from utils.testcases import BaseTransactionTestCase


class MethodNodesViewTestCase(BaseTransactionTestCase):
    def test_list(self) -> None:
        response = self.owner_client.get(reverse("nodes:methods-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
        factories.MethodNodeFactory.create_batch(10, creator=self.owner_user, owner=self.owner_user)
        with self.assertNumQueries(3):
            response = self.owner_client.get(reverse("nodes:methods-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 10)

    def test_retrieve(self) -> None:
        node = factories.MethodNodeFactory.create(creator=self.owner_user, owner=self.owner_user)

        response = self.owner_client.get(reverse("nodes:methods-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(node.public_id))

    def test_create(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        response = self.owner_client.post(
            reverse("nodes:methods-list"), {"space": str(space.public_id)}
        )
        self.assertEqual(response.status_code, 201)

    def test_update(self) -> None:
        node = factories.MethodNodeFactory.create(owner=self.owner_user)
        response = self.owner_client.patch(
            reverse("nodes:methods-detail", args=[node.public_id]), {"name": "new name"}
        )
        self.assertEqual(response.status_code, 200)

    def test_delete(self) -> None:
        node = factories.MethodNodeFactory.create(owner=self.owner_user)
        response = self.owner_client.delete(reverse("nodes:methods-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 204)

        node.refresh_from_db()
        self.assertEqual(node.is_removed, True)

    def test_permissions(self) -> None:
        # A method node by itself should not be visible to the viewer.
        node = factories.MethodNodeFactory.create(owner=self.owner_user)

        response = self.viewer_client.get(reverse("nodes:methods-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

        # Also check that the viewer can't access the node directly.
        response = self.viewer_client.get(reverse("nodes:methods-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 403)

        # Check that the viewer can't update or delete the node.
        response = self.viewer_client.patch(
            reverse("nodes:methods-detail", args=[node.public_id]), {"name": "new name"}
        )
        self.assertEqual(response.status_code, 403)

        response = self.viewer_client.delete(reverse("nodes:methods-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 403)

        # Add the viewer to the method node.
        permission_factories.ObjectMembershipFactory.create(
            content_object=node, user=self.viewer_user, role=permissions.utils.get_viewer_role()
        )

        response = self.viewer_client.get(reverse("nodes:methods-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

        response = self.viewer_client.get(reverse("nodes:methods-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(node.public_id))

        # Check that the owner can delete the node and that we can't see the node once it has been
        # soft-deleted.
        response = self.owner_client.delete(reverse("nodes:methods-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 204)

        response = self.viewer_client.get(reverse("nodes:methods-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

        response = self.viewer_client.get(reverse("nodes:methods-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 404)

    def test_requesting_node_permissions(self):
        node = factories.MethodNodeFactory.create(owner=self.owner_user, viewer=self.viewer_user)

        response = self.owner_client.get(
            reverse("nodes:methods-detail", args=[node.public_id]), {"show_permissions": "true"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertSetEqual(
            set(response.data["allowed_actions"]),
            {
                permissions.models.READ,
                permissions.models.WRITE,
                permissions.models.MANAGE,
                permissions.models.DELETE,
            },
        )

        response = self.viewer_client.get(
            reverse("nodes:methods-detail", args=[node.public_id]), {"show_permissions": "true"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertSetEqual(
            set(response.data["allowed_actions"]),
            {permissions.models.READ},
        )
