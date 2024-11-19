from django.urls import reverse

import nodes.models
from nodes.tests import factories
from utils.testcases import BaseTransactionTestCase


class DocumentVersionViewTestCase(BaseTransactionTestCase):
    def test_list(self) -> None:
        response = self.owner_client.get(reverse("nodes:document-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

        space = factories.SpaceFactory.create(owner=self.owner_user)
        document = factories.DocumentFactory.create()
        factories.NodeFactory.create(space=space, editor_document=document)
        factories.DocumentVersionFactory.create(document=document)
        response = self.owner_client.get(reverse("nodes:document-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_retrieve(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        document = factories.DocumentFactory.create()
        factories.NodeFactory.create(space=space, editor_document=document)
        document_version = factories.DocumentVersionFactory.create(document=document)

        response = self.owner_client.get(
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
        space = factories.SpaceFactory.create(owner=self.owner_user)
        nodes.models.DocumentVersion.objects.all().delete()

        document = factories.DocumentFactory.create(document_type="type")
        document_with_different_type = factories.DocumentFactory.create(
            public_id=document.public_id, document_type="another_type"
        )
        factories.NodeFactory.create(
            public_id=document.public_id,
            editor_document=document,
            graph_document=document_with_different_type,
            space=space,
        )

        another_document = factories.DocumentFactory.create(document_type="type")
        factories.NodeFactory.create(
            public_id=another_document.public_id,
            editor_document=another_document,
            space=space,
        )
        document_version = factories.DocumentVersionFactory.create(
            document=document, document_type="GRAPH"
        )
        document_version_with_different_type = factories.DocumentVersionFactory.create(
            document=document_with_different_type, document_type="another_type"
        )

        response = self.owner_client.get(
            reverse("nodes:document-versions-list"), {"document": document.public_id}
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["count"], 2)
        self.assertSetEqual(
            {item["id"] for item in response.data["results"]},
            {str(document_version.public_id), str(document_version_with_different_type.public_id)},
        )

        response = self.owner_client.get(
            reverse("nodes:document-versions-list"), {"document": another_document.public_id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

        factories.DocumentVersionFactory.create(document=another_document, document_type="GRAPH")
        response = self.owner_client.get(
            reverse("nodes:document-versions-list"), {"document_type": "GRAPH"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)

        response = self.owner_client.get(
            reverse("nodes:document-versions-list"),
            {"document_type": "GRAPH", "document": document.public_id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_permission_inheritance(self) -> None:
        """
        Regression test to see if space permissions trickle down to document versions of their
        nodes.
        """

        space = factories.SpaceFactory.create(owner=self.owner_user)
        document = factories.DocumentFactory.create()
        node = factories.NodeFactory.create(editor_document=document)
        space.nodes.add(node)
        document_version = factories.DocumentVersionFactory.create(document=document)

        response = self.owner_client.get(
            reverse("nodes:document-versions-detail", args=[document_version.public_id])
        )
        self.assertEqual(response.status_code, 200)

        response = self.owner_client.get(reverse("nodes:document-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_ordering(self) -> None:
        space = factories.SpaceFactory.create(owner=self.owner_user)
        document = factories.DocumentFactory.create()
        factories.NodeFactory.create(space=space, editor_document=document)
        document_version_1 = factories.DocumentVersionFactory.create(
            document=document, created_at="2021-01-01T00:00:00Z"
        )
        document_version_2 = factories.DocumentVersionFactory.create(
            document=document, created_at="2021-01-02T00:00:00Z"
        )

        response = self.owner_client.get(
            reverse("nodes:document-versions-list"), {"ordering": "created_at"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertListEqual(
            [item["id"] for item in response.data["results"]],
            [str(document_version_1.public_id), str(document_version_2.public_id)],
        )

        response = self.owner_client.get(
            reverse("nodes:document-versions-list"), {"ordering": "-created_at"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertListEqual(
            [item["id"] for item in response.data["results"]],
            [str(document_version_2.public_id), str(document_version_1.public_id)],
        )
