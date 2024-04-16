"""
Module for all Form Tests.
"""

from django.utils.translation import gettext_lazy as _

from users.forms import UserAdminCreationForm
from users.tests import factories
from utils.testcases import BaseAPITransactionTestCase


class TestUserAdminCreationForm(BaseAPITransactionTestCase):
    """
    Test class for all tests related to the UserAdminCreationForm
    """

    def setUp(self) -> None:
        super().setUp()
        self.user = factories.UserFactory()

    def test_username_validation_error_msg(self) -> None:
        """
        Tests UserAdminCreation Form's unique validator functions correctly by testing:
            1) A new user with an existing username cannot be added.
            2) Only 1 error is raised by the UserCreation Form
            3) The desired error message is raised
        """

        # The user already exists,
        # hence cannot be created.
        form = UserAdminCreationForm(
            {
                "email": self.user.email,
                "password1": self.user.password,
                "password2": self.user.password,
            }
        )

        self.assertFalse(form.is_valid())
        self.assertEqual(len(form.errors), 1)
        self.assertIn("email", form.errors)
        self.assertEqual(form.errors["email"][0], _("This email has already been taken."))
