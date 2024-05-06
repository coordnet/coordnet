import factories
from django.urls import reverse

from nodes import models
from utils.testcases import BaseTransactionTestCase


class SpacesViewTestCase(BaseTransactionTestCase):
    def test_list(self) -> None:
        response = self.owner_client.get(reverse("nodes:spaces-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
        space = factories.SpaceFactory.create(owner=self.owner_user)
        with self.assertNumQueries(3):
            response = self.owner_client.get(reverse("nodes:spaces-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        nodes = factories.NodeFactory.create_batch(10)
        space.nodes.set(nodes)

        with self.assertNumQueries(3):
            response = self.owner_client.get(reverse("nodes:spaces-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        # Test that soft deleted spaces are not returned
        space.delete()
        response = self.owner_client.get(reverse("nodes:spaces-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_retrieve(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        response = self.owner_client.get(reverse("nodes:spaces-detail", args=[space.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(space.public_id))

        # Test that soft deleted spaces are not returned
        space.delete()
        response = self.owner_client.get(reverse("nodes:spaces-detail", args=[space.public_id]))
        self.assertEqual(response.status_code, 404)

    def test_create(self) -> None:
        response = self.owner_client.post(reverse("nodes:spaces-list"), {"title": "new space"})
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["title"], "new space")
        self.assertEqual(response.data["title_slug"], "new-space")

    def test_update(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        response = self.owner_client.patch(
            reverse("nodes:spaces-detail", args=[space.public_id]), {"title": "new name"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "new name")

        # The title slug shouldn't get updated when the title is updated
        self.assertEqual(response.data["title_slug"], space.title_slug)

    def test_delete(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        response = self.owner_client.delete(reverse("nodes:spaces-detail", args=[space.public_id]))
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.data, None)

        # Test that the space is soft deleted
        self.assertEqual(models.Space.all_objects.count(), 1)
        self.assertEqual(models.Space.available_objects.count(), 0)

    def test_default_node_setting(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        node = factories.NodeFactory.create()
        response = self.owner_client.patch(
            reverse("nodes:spaces-detail", args=[space.public_id]),
            {"default_node": str(node.public_id)},
        )
        self.assertEqual(response.status_code, 200)
        space.refresh_from_db()
        self.assertEqual(space.default_node, node)

    def test_permissions(self) -> None:
        space = factories.SpaceFactory.create()

        response = self.viewer_client.get(reverse("nodes:spaces-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

        response = self.viewer_client.get(reverse("nodes:spaces-detail", args=[space.public_id]))
        self.assertEqual(response.status_code, 403)

        response = self.viewer_client.patch(
            reverse("nodes:spaces-detail", args=[space.public_id]), {"title": "new name"}
        )
        self.assertEqual(response.status_code, 403)

        response = self.viewer_client.delete(reverse("nodes:spaces-detail", args=[space.public_id]))
        self.assertEqual(response.status_code, 403)
