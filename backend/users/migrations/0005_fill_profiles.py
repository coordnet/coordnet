# Generated by Django 5.1.3 on 2024-11-25 19:30

from django.db import migrations
from django.utils.text import slugify

import profiles.utils


def fill_profiles(apps, schema_editor):
    User = apps.get_model("users", "User")
    Profile = apps.get_model("profiles", "Profile")

    for user in User.objects.filter(profile__isnull=True):
        profile_slug_base = slugify(user.name.strip() or "user")
        profile_slug = profile_slug_base

        while Profile.objects.filter(profile_slug=profile_slug).exists():
            profile_slug = f"{profile_slug_base}-{profiles.utils.random_string(4)}"

        user.profile = Profile.objects.create(profile_slug=profile_slug, title=user.name)
        user.save(update_fields=["profile"])


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0004_user_profile"),
    ]

    operations = [
        migrations.RunPython(fill_profiles, migrations.RunPython.noop),
    ]
