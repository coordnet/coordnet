from django.urls import reverse
from rest_framework.test import APIClient

from users.tests import factories
from utils.testcases import BaseTransactionTestCase


class SwaggerTestCase(BaseTransactionTestCase):
    def setUp(self) -> None:
        super().setUp()
        admin = factories.UserFactory(is_staff=True, is_superuser=True)
        self.admin_client = APIClient()
        self.admin_client.force_login(admin)

    def test_swagger_accessible_by_admin(self) -> None:
        url = reverse("api-docs")
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_swagger_ui_not_accessible_by_normal_user(self) -> None:
        url = reverse("api-docs")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 401)

    def test_api_schema_generated_successfully(self) -> None:
        url = reverse("api-schema")
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, 200)
