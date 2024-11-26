import typing
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.urls import reverse
from django.utils.translation import gettext_lazy as _

from users.managers import UserManager


class User(AbstractUser):
    """
    Default custom user model for the Coordination Network.
    If adding fields that need to be filled at user signup, check forms.SignupForm and
    forms.SocialSignupForms accordingly.
    """

    # First and last name do not cover name patterns around the globe
    name = models.CharField(_("name of user"), blank=True, max_length=255)
    first_name = None  # type: ignore[assignment]
    last_name = None  # type: ignore[assignment]
    email = models.EmailField(_("email address"), unique=True)
    username = None  # type: ignore[assignment]
    public_id = models.UUIDField(_("public id"), unique=True, default=uuid.uuid4, editable=False)

    profile = models.OneToOneField(
        "profiles.Profile", on_delete=models.CASCADE, related_name="user"
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects: typing.ClassVar[UserManager] = UserManager()

    def get_absolute_url(self) -> str:
        """Get URL for user's detail view.

        Returns:
            str: URL for user detail.

        """
        return reverse("users:detail", kwargs={"pk": self.id})
