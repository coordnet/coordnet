from django.conf import settings
from django.db.models.signals import pre_save
from django.dispatch import receiver

import nodes.models

from .models import Profile


@receiver(pre_save, sender=settings.AUTH_USER_MODEL, dispatch_uid="create_user_profile")
def create_user_profile(sender, instance, **kwargs):
    if instance.profile_id is None:
        instance.profile = Profile.objects.create(
            profile_slug=instance.name if instance.name else "user", title=instance.name or "User"
        )


@receiver(pre_save, sender=nodes.models.Space, dispatch_uid="create_space_profile")
def create_space_profile(sender, instance, **kwargs):
    if instance.profile_id is None:
        instance.profile = Profile.objects.create(
            profile_slug=instance.title if instance.title else "space",
            title=instance.title or "Space",
        )
