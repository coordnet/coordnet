# Generated by Django 4.2.7 on 2024-04-09 10:50

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("nodes", "0016_alter_space_deleted_nodes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="documentversion",
            name="public_id",
            field=models.UUIDField(
                db_index=True, default=uuid.uuid4, editable=False, unique=True
            ),
        ),
    ]
