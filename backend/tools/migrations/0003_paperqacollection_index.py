# Generated by Django 5.1.9 on 2025-05-30 09:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tools", "0002_remove_paperqacollection_files_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="paperqacollection",
            name="index",
            field=models.BinaryField(blank=True, null=True),
        ),
    ]
