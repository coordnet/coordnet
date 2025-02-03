from django.urls import reverse

from nodes.tests import factories
from utils.testcases import BaseTransactionTestCase


class MethodNodeRunTestCase(BaseTransactionTestCase):
    def test_list(self) -> None:
        response = self.owner_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

        factories.MethodNodeRunFactory.create_batch(10, user=self.owner_user)
        with self.assertNumQueries(2):
            response = self.owner_client.get(reverse("nodes:method-runs-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 10)

    def test_retrieve(self) -> None:
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)

        with self.assertNumQueries(2):
            response = self.owner_client.get(
                reverse("nodes:method-runs-detail", args=[method_run.public_id])
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(method_run.public_id))

    def test_create(self) -> None:
        method = factories.MethodNodeFactory.create(owner=self.owner_user)
        response = self.owner_client.post(
            reverse("nodes:method-runs-list"),
            {
                "method": method.public_id,
                "method_version": factories.MethodNodeVersionFactory.create(
                    method=method
                ).public_id,
                "space": factories.SpaceFactory.create(owner=self.owner_user).public_id,
                "method_data": {"key": "value"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)

    def test_update(self) -> None:
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)
        response = self.owner_client.patch(
            reverse("nodes:method-runs-detail", args=[method_run.public_id]),
            {"name": "new name"},
        )
        self.assertEqual(response.status_code, 403)

        response = self.viewer_client.patch(
            reverse("nodes:method-runs-detail", args=[method_run.public_id]),
            {"name": "new name"},
        )
        self.assertEqual(response.status_code, 403)

    def test_delete(self) -> None:
        method_run = factories.MethodNodeRunFactory.create(user=self.owner_user)
        response = self.viewer_client.delete(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 403)

        response = self.owner_client.delete(
            reverse("nodes:method-runs-detail", args=[method_run.public_id])
        )
        self.assertEqual(response.status_code, 204)
