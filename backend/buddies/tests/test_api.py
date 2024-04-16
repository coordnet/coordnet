from django.urls import reverse

from buddies.tests import factories
from nodes.tests import factories as node_factories
from utils.testcases import BaseAPITransactionTestCase


class BuddyViewSetTestCase(BaseAPITransactionTestCase):
    def test_buddy_query(self) -> None:
        response = self.client.post(reverse("buddies:buddies-query", kwargs={"public_id": "test"}))
        self.assertEqual(response.status_code, 404)

        buddy = factories.BuddyFactory()
        node = node_factories.NodeFactory()
        response = self.client.post(
            reverse("buddies:buddies-query", kwargs={"public_id": buddy.public_id}),
            data={"nodes": [node.public_id], "level": 1, "message": "test"},
        )
        self.assertEqual(response.status_code, 200)

    def test_buddy_query_empty(self) -> None:
        buddy = factories.BuddyFactory()
        node = node_factories.NodeFactory()
        response = self.client.post(
            reverse("buddies:buddies-query", kwargs={"public_id": buddy.public_id}),
            data={"nodes": [node.public_id], "level": 1, "message": ""},
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            reverse("buddies:buddies-query", kwargs={"public_id": buddy.public_id}),
            data={
                "nodes": [node.public_id],
                "level": 1,
            },
        )
        self.assertEqual(response.status_code, 200)

        with self.assertRaises(TypeError):
            self.client.post(
                reverse("buddies:buddies-token-counts", kwargs={"public_id": buddy.public_id}),
                data={
                    "nodes": [node.public_id],
                    "level": 1,
                    "message": None,
                },
            )

    def test_token_counts(self) -> None:
        response = self.client.post(
            reverse("buddies:buddies-token-counts", kwargs={"public_id": "test"})
        )
        self.assertEqual(response.status_code, 404)

        buddy = factories.BuddyFactory()
        node = node_factories.NodeFactory()
        response = self.client.post(
            reverse("buddies:buddies-token-counts", kwargs={"public_id": buddy.public_id}),
            data={"nodes": [node.public_id], "level": 1, "message": "test"},
        )
        self.assertEqual(response.status_code, 200)

    def test_token_counts_empty(self) -> None:
        buddy = factories.BuddyFactory()
        node = node_factories.NodeFactory()
        response = self.client.post(
            reverse("buddies:buddies-token-counts", kwargs={"public_id": buddy.public_id}),
            data={"nodes": [node.public_id], "level": 1, "message": ""},
        )
        self.assertEqual(response.status_code, 200)
        empty_string_count = response.json()["0"]

        response = self.client.post(
            reverse("buddies:buddies-token-counts", kwargs={"public_id": buddy.public_id}),
            data={
                "nodes": [node.public_id],
                "level": 1,
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["0"], empty_string_count)

        with self.assertRaises(TypeError):
            self.client.post(
                reverse("buddies:buddies-token-counts", kwargs={"public_id": buddy.public_id}),
                data={
                    "nodes": [node.public_id],
                    "level": 1,
                    "message": None,
                },
            )
