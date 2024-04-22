from django.urls import reverse
from rest_framework.test import APIClient

from users import models
from users.tests import factories
from utils.testcases import BaseTransactionTestCase


class TestUserAdmin(BaseTransactionTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.admin_user = factories.UserFactory(
            email="admin@example.com", is_staff=True, is_superuser=True
        )
        self.admin_client = APIClient()
        self.admin_client.force_login(self.admin_user)

    def test_changelist(self) -> None:
        url = reverse("admin:users_user_changelist")
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_search(
        self,
    ) -> None:
        url = reverse("admin:users_user_changelist")
        response = self.admin_client.get(url, data={"q": "test"})
        self.assertEqual(response.status_code, 200)

    def test_add(
        self,
    ) -> None:
        url = reverse("admin:users_user_add")
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, 200)

        response = self.admin_client.post(
            url,
            data={
                "email": "new-admin@example.com",
                "password1": "My_R@ndom-P@ssw0rd",
                "password2": "My_R@ndom-P@ssw0rd",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(models.User.objects.filter(email="new-admin@example.com").exists())

    def test_view_user(self) -> None:
        url = reverse("admin:users_user_change", kwargs={"object_id": self.admin_user.pk})
        response = self.admin_client.get(url)
        self.assertEqual(response.status_code, 200)
