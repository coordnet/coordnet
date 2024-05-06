import factories
from django.urls import reverse

from utils.testcases import BaseTransactionTestCase


class NodesViewTestCase(BaseTransactionTestCase):
    def test_list(self) -> None:
        response = self.owner_client.get(reverse("nodes:nodes-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
        factories.NodeFactory.create(owner=self.owner_user)
        response = self.owner_client.get(reverse("nodes:nodes-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_retrieve(self) -> None:
        node = factories.NodeFactory.create(owner=self.owner_user)
        node_2 = factories.NodeFactory.create()
        node.subnodes.add(node_2)

        response = self.owner_client.get(reverse("nodes:nodes-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(node.public_id))
        self.assertEqual(len(response.data["subnodes"]), 1)

        node_2.delete()
        self.assertEqual(node.subnodes.count(), 1)

        response = self.owner_client.get(reverse("nodes:nodes-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["subnodes"]), 0)

    def test_create(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        response = self.owner_client.post(
            reverse("nodes:nodes-list"), {"space": str(space.public_id)}
        )
        self.assertEqual(response.status_code, 405)

    def test_update(self) -> None:
        node = factories.NodeFactory.create(owner=self.owner_user)
        response = self.owner_client.patch(
            reverse("nodes:nodes-detail", args=[node.public_id]), {"name": "new name"}
        )
        self.assertEqual(response.status_code, 405)

    def test_delete(self) -> None:
        node = factories.NodeFactory.create(owner=self.owner_user)
        response = self.owner_client.delete(reverse("nodes:nodes-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 405)

    def test_filter_by_space(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        another_space = factories.SpaceFactory.create(owner=self.owner_user)
        node = factories.NodeFactory.create()
        space.nodes.add(node)

        response = self.owner_client.get(
            reverse("nodes:nodes-list"), {"spaces": str(space.public_id)}
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(node.public_id))

        response = self.owner_client.get(
            reverse("nodes:nodes-list"), {"spaces": str(another_space.public_id)}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_permissions(self) -> None:
        node = factories.NodeFactory.create()

        response = self.viewer_client.get(reverse("nodes:nodes-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

        response = self.viewer_client.get(reverse("nodes:nodes-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 403)

        response = self.viewer_client.patch(
            reverse("nodes:nodes-detail", args=[node.public_id]), {"name": "new name"}
        )
        self.assertEqual(response.status_code, 405)

        response = self.viewer_client.delete(reverse("nodes:nodes-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 405)

        # Now add a space and check that the viewer can see the node.
        space = factories.SpaceFactory.create(viewer=self.viewer_user)
        space.nodes.add(node)

        response = self.viewer_client.get(
            reverse("nodes:nodes-list"), {"spaces": str(space.public_id)}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        response = self.viewer_client.get(reverse("nodes:nodes-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(node.public_id))

        # If we add a subnode, the viewer should be able to see it because they have access to the
        # space.
        subnode = factories.NodeFactory.create()
        node.subnodes.add(subnode)
        space.nodes.add(subnode)

        response = self.viewer_client.get(
            reverse("nodes:nodes-list"), {"spaces": str(space.public_id)}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

        response = self.viewer_client.get(reverse("nodes:nodes-detail", args=[subnode.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(subnode.public_id))

        space = factories.SpaceFactory.create(owner=self.owner_user)
        node = factories.NodeFactory.create(viewer=self.viewer_user)
        subnode = factories.NodeFactory.create()
        node.subnodes.add(subnode)
        space.nodes.add(subnode, node)

        # Check that we can see the nodes we have access to even though we don't have access to the
        # space we filter by.
        response = self.viewer_client.get(
            reverse("nodes:nodes-list"), {"spaces": str(space.public_id)}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

        # We can also access the subnode directly because we have access to its parent node.
        response = self.viewer_client.get(reverse("nodes:nodes-detail", args=[subnode.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(subnode.public_id))

        # Check that we don't see the node once it has been soft deleted.
        node.delete()
        response = self.viewer_client.get(
            reverse("nodes:nodes-list"), {"spaces": str(space.public_id)}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

        response = self.viewer_client.get(reverse("nodes:nodes-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 404)
