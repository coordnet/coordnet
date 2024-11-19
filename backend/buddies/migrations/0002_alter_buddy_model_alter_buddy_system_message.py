# Generated by Django 5.1.3 on 2024-11-12 09:37

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("buddies", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="buddy",
            name="model",
            field=models.CharField(
                help_text="The LLM model this buddy will be using.",
                max_length=255,
                verbose_name="LLM Model",
            ),
        ),
        migrations.AlterField(
            model_name="buddy",
            name="system_message",
            field=models.TextField(
                help_text="The message sent to the LLM before the user's query."
            ),
        ),
    ]
