# Generated by Django 5.1.3 on 2024-11-26 15:56

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("nodes", "0033_alter_space_profile"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="space",
            name="profile",
        ),
    ]