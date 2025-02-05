from django.urls import reverse

from nodes.tests import factories
from utils.testcases import BaseTransactionTestCase


class MethodNodeVersionsTestCase(BaseTransactionTestCase):
    def test_list(self) -> None:
        response = self.owner_client.get(reverse("nodes:method-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

        method = factories.MethodNodeFactory.create(owner=self.owner_user)

        factories.MethodNodeVersionFactory.create_batch(10, method=method)
        with self.assertNumQueries(3):
            response = self.owner_client.get(reverse("nodes:method-versions-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 10)

    def test_retrieve(self) -> None:
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        method_version = factories.MethodNodeVersionFactory.create(method=method)

        with self.assertNumQueries(3):
            response = self.owner_client.get(
                reverse("nodes:method-versions-detail", args=[method_version.public_id])
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(method_version.public_id))

    def test_create(self) -> None:
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        response = self.owner_client.post(
            reverse("nodes:method-versions-list"),
            {
                "method": method.public_id,
                "method_data": '{"data": 1}',
            },
        )
        self.assertEqual(response.status_code, 201, response.data)

    def test_update(self) -> None:
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        method_version = factories.MethodNodeVersionFactory.create(
            method=method, title="old name", method_data='{"data": 1}', version=1
        )
        response = self.owner_client.patch(
            reverse("nodes:method-versions-detail", args=[method_version.public_id]),
            {
                "title": "new name",
                "method_data": '{"data": 123}',
                "version": 2,
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "old name")
        self.assertEqual(response.data["version"], 1)

        method_version.refresh_from_db()
        self.assertEqual(method_version.method_data, '{"data": 1}')

    def test_delete(self) -> None:
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        method_version = factories.MethodNodeVersionFactory.create(method=method)

        response = self.owner_client.delete(
            reverse("nodes:method-versions-detail", args=[method_version.public_id])
        )
        self.assertEqual(response.status_code, 204)
        method_version.refresh_from_db()
        self.assertTrue(method_version.is_removed)
