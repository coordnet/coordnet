from django.urls import resolve, reverse
from rest_framework.test import APITransactionTestCase

from users.tests import factories


class DRFURLsTestCase(APITransactionTestCase):
    def test_user_detail(self) -> None:
        user = factories.UserFactory()
        self.assertEqual(
            reverse("auth:user-detail", kwargs={"public_id": user.public_id}),
            f"/api/users/{str(user.public_id)}/",
        )
        self.assertEqual(
            resolve(f"/api/users/{str(user.public_id)}/").view_name, "auth:user-detail"
        )

    def test_user_list(self) -> None:
        self.assertEqual(reverse("auth:user-list"), "/api/users/")
        self.assertEqual(resolve("/api/users/").view_name, "auth:user-list")

    def test_user_me(self) -> None:
        self.assertEqual(reverse("auth:user-me"), "/api/users/me/")
        self.assertEqual(resolve("/api/users/me/").view_name, "auth:user-me")
