from __future__ import annotations

import typing

from django.contrib.auth import get_user_model
from factory import Faker, post_generation
from factory.django import DjangoModelFactory

if typing.TYPE_CHECKING:
    from collections.abc import Sequence
    from typing import Any

    from users.models import User


class UserFactory(DjangoModelFactory):
    email = Faker("email")
    name = Faker("name")

    @post_generation
    def password(self, create: bool, extracted: Sequence[Any], **kwargs: Any) -> None:
        password = (
            extracted
            if extracted
            else Faker(
                "password",
                length=42,
                special_chars=True,
                digits=True,
                upper_case=True,
                lower_case=True,
            ).evaluate(None, None, extra={"locale": None})
        )
        self.set_password(password)

    @classmethod
    def _after_postgeneration(
        cls, instance: User, create: bool, results: Sequence[Any] | None = None
    ) -> None:
        """Save again the instance if creating and at least one hook ran."""
        if create and results and not cls._meta.skip_postgeneration_save:
            # Some post-generation hooks ran, and may have modified us.
            instance.save()

    class Meta:
        model = get_user_model()
        django_get_or_create = ["email"]
