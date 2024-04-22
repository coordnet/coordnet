from django.urls import resolve, reverse

from users.tests import factories
from utils.testcases import BaseTransactionTestCase


class URLTestCase(BaseTransactionTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.user = factories.UserFactory()

    def test_detail(self) -> None:
        self.assertEqual(
            reverse("users:detail", kwargs={"pk": self.user.pk}),
            f"/users/{self.user.pk}/",
        )
        self.assertEqual(resolve(f"/users/{self.user.pk}/").view_name, "users:detail")

    def test_update(self) -> None:
        self.assertEqual(reverse("users:update"), "/users/~update/")
        self.assertEqual(resolve("/users/~update/").view_name, "users:update")

    def test_redirect(self) -> None:
        self.assertEqual(reverse("users:redirect"), "/users/~redirect/")
        self.assertEqual(resolve("/users/~redirect/").view_name, "users:redirect")
