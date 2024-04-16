import uuid

from django.urls import reverse

from nodes import models
from nodes.tests import factories
from utils.testcases import BaseAPITransactionTestCase


class NodesViewTestCase(BaseAPITransactionTestCase):
    def test_list(self) -> None:
        response = self.client.get(reverse("nodes:nodes-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
        factories.NodeFactory.create()
        response = self.client.get(reverse("nodes:nodes-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_retrieve(self) -> None:
        node = factories.NodeFactory.create()
        response = self.client.get(reverse("nodes:nodes-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(node.public_id))

    def test_create(self) -> None:
        space = factories.SpaceFactory.create()
        response = self.client.post(reverse("nodes:nodes-list"), {"space": str(space.public_id)})
        self.assertEqual(response.status_code, 405)

    def test_update(self) -> None:
        node = factories.NodeFactory.create()
        response = self.client.patch(
            reverse("nodes:nodes-detail", args=[node.public_id]), {"name": "new name"}
        )
        self.assertEqual(response.status_code, 405)

    def test_delete(self) -> None:
        node = factories.NodeFactory.create()
        response = self.client.delete(reverse("nodes:nodes-detail", args=[node.public_id]))
        self.assertEqual(response.status_code, 405)

    def test_filter_by_space(self) -> None:
        space = factories.SpaceFactory.create()
        another_space = factories.SpaceFactory.create()
        node = factories.NodeFactory.create()
        space.nodes.add(node)

        response = self.client.get(reverse("nodes:nodes-list"), {"spaces": str(space.public_id)})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(node.public_id))

        response = self.client.get(
            reverse("nodes:nodes-list"), {"spaces": str(another_space.public_id)}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)


class SpacesViewTestCase(BaseAPITransactionTestCase):
    def test_list(self) -> None:
        response = self.client.get(reverse("nodes:spaces-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
        space = factories.SpaceFactory.create()
        with self.assertNumQueries(3):
            response = self.client.get(reverse("nodes:spaces-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        nodes = factories.NodeFactory.create_batch(10)
        space.nodes.set(nodes)

        with self.assertNumQueries(3):
            response = self.client.get(reverse("nodes:spaces-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        # Test that soft deleted spaces are not returned
        space.delete()
        response = self.client.get(reverse("nodes:spaces-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_retrieve(self) -> None:
        space = factories.SpaceFactory.create()
        response = self.client.get(reverse("nodes:spaces-detail", args=[space.public_id]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(space.public_id))

        # Test that soft deleted spaces are not returned
        space.delete()
        response = self.client.get(reverse("nodes:spaces-detail", args=[space.public_id]))
        self.assertEqual(response.status_code, 404)

    def test_create(self) -> None:
        response = self.client.post(reverse("nodes:spaces-list"), {"title": "new space"})
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["title"], "new space")
        self.assertEqual(response.data["title_slug"], "new-space")

    def test_update(self) -> None:
        space = factories.SpaceFactory.create()
        response = self.client.patch(
            reverse("nodes:spaces-detail", args=[space.public_id]), {"title": "new name"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "new name")

        # The title slug shouldn't get updated when the title is updated
        self.assertEqual(response.data["title_slug"], space.title_slug)

    def test_delete(self) -> None:
        space = factories.SpaceFactory.create()
        response = self.client.delete(reverse("nodes:spaces-detail", args=[space.public_id]))
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.data, None)

        # Test that the space is soft deleted
        self.assertEqual(models.Space.all_objects.count(), 1)
        self.assertEqual(models.Space.available_objects.count(), 0)

    def test_default_node_setting(self) -> None:
        space = factories.SpaceFactory.create()
        node = factories.NodeFactory.create()
        response = self.client.patch(
            reverse("nodes:spaces-detail", args=[space.public_id]),
            {"default_node": str(node.public_id)},
        )
        self.assertEqual(response.status_code, 200)
        space.refresh_from_db()
        self.assertEqual(space.default_node, node)


class DocumentVersionViewTestCase(BaseAPITransactionTestCase):
    def test_list(self) -> None:
        response = self.client.get(reverse("nodes:document-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
        factories.DocumentVersionFactory.create()
        response = self.client.get(reverse("nodes:document-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_retrieve(self) -> None:
        document_version = factories.DocumentVersionFactory.create()
        response = self.client.get(
            reverse("nodes:document-versions-detail", args=[document_version.public_id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(document_version.public_id))

    def test_create(self) -> None:
        response = self.client.post(reverse("nodes:document-versions-list"), {})
        self.assertEqual(response.status_code, 405)

    def test_update(self) -> None:
        document_version = factories.DocumentVersionFactory.create()
        response = self.client.patch(
            reverse("nodes:document-versions-detail", args=[document_version.public_id]),
            {"name": "new name"},
        )
        self.assertEqual(response.status_code, 405)

    def test_delete(self) -> None:
        document_version = factories.DocumentVersionFactory.create()
        response = self.client.delete(
            reverse("nodes:document-versions-detail", args=[document_version.public_id])
        )
        self.assertEqual(response.status_code, 405)

    def test_filter_by_document_and_type(self) -> None:
        document_uuid = uuid.uuid4()
        document = factories.DocumentFactory.create(public_id=document_uuid, document_type="type")
        document_with_different_type = factories.DocumentFactory.create(
            public_id=document_uuid, document_type="another_type"
        )
        another_document = factories.DocumentFactory.create(document_type="type")
        document_version = factories.DocumentVersionFactory.create(
            document=document, document_type="type"
        )
        document_version_with_different_type = factories.DocumentVersionFactory.create(
            document=document_with_different_type, document_type="another_type"
        )
        response = self.client.get(
            reverse("nodes:document-versions-list"), {"document": document.public_id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertSetEqual(
            {item["id"] for item in response.data},
            {str(document_version.public_id), str(document_version_with_different_type.public_id)},
        )

        response = self.client.get(
            reverse("nodes:document-versions-list"), {"document": another_document.public_id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

        factories.DocumentVersionFactory.create(document=another_document, document_type="type")
        response = self.client.get(
            reverse("nodes:document-versions-list"), {"document_type": "type"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

        response = self.client.get(
            reverse("nodes:document-versions-list"),
            {"document_type": "type", "document": document.public_id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
