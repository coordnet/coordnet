from io import StringIO

from django.core.management import call_command

from users.models import User
from utils.testcases import BaseTransactionTestCase


class TestUserManager(BaseTransactionTestCase):
    def test_create_user(self) -> None:
        user = User.objects.create_user(
            email="john@example.com",
            password="something-r@nd0m!",
        )
        assert user.email == "john@example.com"
        assert not user.is_staff
        assert not user.is_superuser
        assert user.check_password("something-r@nd0m!")
        assert user.username is None

    def test_create_superuser(self) -> None:
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="something-r@nd0m!",
        )
        assert user.email == "admin@example.com"
        assert user.is_staff
        assert user.is_superuser
        assert user.username is None

    def test_create_superuser_username_ignored(self) -> None:
        user = User.objects.create_superuser(
            email="test@example.com",
            password="something-r@nd0m!",
        )
        assert user.username is None

    def test_createsuperuser_command(self) -> None:
        """Ensure createsuperuser command works with our custom manager."""
        out = StringIO()
        command_result = call_command(
            "createsuperuser",
            "--email",
            "henry@example.com",
            interactive=False,
            stdout=out,
        )

        self.assertIsNone(command_result)
        self.assertEqual(out.getvalue(), "Superuser created successfully.\n")
        user = User.objects.get(email="henry@example.com")
        self.assertFalse(user.has_usable_password())
