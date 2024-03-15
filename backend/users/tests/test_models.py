from django.test import TransactionTestCase

from users.tests import factories


class TestUserModel(TransactionTestCase):
    def test_user_get_absolute_url(self) -> None:
        user = factories.UserFactory()
        self.assertEqual(user.get_absolute_url(), f"/users/{user.pk}/")
