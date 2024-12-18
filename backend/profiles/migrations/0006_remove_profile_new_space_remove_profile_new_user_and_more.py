# Generated by Django 5.1.3 on 2024-11-26 16:00

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("nodes", "0034_remove_space_profile"),
        ("users", "0007_remove_user_profile"),
        ("profiles", "0005_move_relation_to_profile"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameField(
            model_name="profile",
            old_name="new_space",
            new_name="space",
        ),
        migrations.RenameField(
            model_name="profile",
            old_name="new_user",
            new_name="user",
        ),
    ]
