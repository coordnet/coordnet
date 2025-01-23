import typing

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

import nodes.models
import profiles.models

if typing.TYPE_CHECKING:
    from users.models import User as UserType


@receiver(post_save, sender=settings.AUTH_USER_MODEL, dispatch_uid="create_user_profile")
def create_user_profile(sender: typing.Any, instance: "UserType", **kwargs: typing.Any) -> None:
    try:
        profiles.models.Profile.objects.get(user=instance)
    except profiles.models.Profile.DoesNotExist:
        profiles.models.Profile.objects.create(
            profile_slug=instance.name if instance.name else "user",
            title=instance.name or "User",
            user=instance,
        )


@receiver(post_save, sender=nodes.models.Space, dispatch_uid="create_space_profile")
def create_space_profile(
    sender: typing.Any, instance: nodes.models.Space, **kwargs: typing.Any
) -> None:
    try:
        profiles.models.Profile.objects.get(space=instance)
    except profiles.models.Profile.DoesNotExist:
        profiles.models.Profile.objects.create(
            profile_slug=instance.title if instance.title else "space",
            title=instance.title or "Space",
            space=instance,
        )
