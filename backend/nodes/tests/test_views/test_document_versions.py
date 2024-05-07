import factories
from django.urls import reverse

from utils.testcases import BaseTransactionTestCase


class DocumentVersionViewTestCase(BaseTransactionTestCase):
    def test_list(self) -> None:
        response = self.owner_client.get(reverse("nodes:document-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

        document = factories.DocumentFactory.create()
        factories.NodeFactory.create(owner=self.owner_user, editor_document=document)
        factories.DocumentVersionFactory.create(document=document)
        response = self.owner_client.get(reverse("nodes:document-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_retrieve(self) -> None:
        document = factories.DocumentFactory.create()
        factories.NodeFactory.create(owner=self.owner_user, editor_document=document)
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
        document = factories.DocumentFactory.create(document_type="type")
        document_with_different_type = factories.DocumentFactory.create(
            public_id=document.public_id, document_type="another_type"
        )
        factories.NodeFactory.create(
            public_id=document.public_id,
            owner=self.owner_user,
            editor_document=document,
            graph_document=document_with_different_type,
        )

        another_document = factories.DocumentFactory.create(
            document_type="type",
        )
        factories.NodeFactory.create(
            owner=self.owner_user,
            public_id=another_document.public_id,
            editor_document=another_document,
        )
        document_version = factories.DocumentVersionFactory.create(
            document=document, document_type="type"
        )
        document_version_with_different_type = factories.DocumentVersionFactory.create(
            document=document_with_different_type, document_type="another_type"
        )

        response = self.owner_client.get(
            reverse("nodes:document-versions-list"), {"document": document.public_id}
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 2)
        self.assertSetEqual(
            {item["id"] for item in response.data},
            {str(document_version.public_id), str(document_version_with_different_type.public_id)},
        )

        response = self.owner_client.get(
            reverse("nodes:document-versions-list"), {"document": another_document.public_id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

        factories.DocumentVersionFactory.create(document=another_document, document_type="type")
        response = self.owner_client.get(
            reverse("nodes:document-versions-list"), {"document_type": "type"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)

        response = self.owner_client.get(
            reverse("nodes:document-versions-list"),
            {"document_type": "type", "document": document.public_id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

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
        self.assertEqual(len(response.data), 1)
