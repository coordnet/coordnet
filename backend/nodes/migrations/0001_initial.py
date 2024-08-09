# Generated by Django 4.2.7 on 2024-03-11 19:50

import uuid

import django.contrib.postgres.fields
import pgtrigger.compiler
import pgtrigger.migrations
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Document",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("public_id", models.UUIDField(editable=False, unique=True)),
                ("data", models.BinaryField()),
                ("json", models.JSONField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="DocumentEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("public_id", models.UUIDField(editable=False)),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("INSERT", "Insert"),
                            ("UPDATE", "Update"),
                            ("DELETE", "Delete"),
                        ],
                        max_length=255,
                    ),
                ),
                ("old_data", models.JSONField(blank=True, null=True)),
                ("new_data", models.JSONField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="Node",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("is_removed", models.BooleanField(default=False)),
                (
                    "public_id",
                    models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("title", models.CharField(max_length=1024)),
                ("title_token_count", models.PositiveIntegerField()),
                ("content", models.JSONField()),
                ("text", models.TextField()),
                ("text_token_count", models.PositiveIntegerField()),
            ],
            options={
                "abstract": False,
            },
        ),
        migrations.CreateModel(
            name="Project",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("is_removed", models.BooleanField(default=False)),
                (
                    "public_id",
                    models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("title", models.CharField(max_length=255)),
                (
                    "deleted_nodes_strings",
                    django.contrib.postgres.fields.ArrayField(
                        base_field=models.CharField(), default=list, size=None
                    ),
                ),
                (
                    "deleted_nodes",
                    models.ManyToManyField(
                        related_name="deleted_projects", to="nodes.node"
                    ),
                ),
                (
                    "nodes",
                    models.ManyToManyField(related_name="projects", to="nodes.node"),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
        migrations.AddIndex(
            model_name="node",
            index=models.Index(
                fields=["public_id"], name="nodes_node_public__cb306f_idx"
            ),
        ),
        pgtrigger.migrations.AddTrigger(
            model_name="document",
            trigger=pgtrigger.compiler.Trigger(
                name="document_change",
                sql=pgtrigger.compiler.UpsertTriggerSql(
                    func="\n                    IF (TG_OP = 'INSERT') THEN\n                        INSERT INTO nodes_documentevent (public_id, action, created_at, new_data) VALUES (NEW.public_id, 'INSERT', NOW(), NEW.json);\n                    ELSIF (TG_OP = 'UPDATE') THEN\n                        INSERT INTO nodes_documentevent (public_id, action, created_at, old_data, new_data) VALUES (NEW.public_id, 'UPDATE', NOW(), OLD.json, NEW.json);\n                    ELSIF (TG_OP = 'DELETE') THEN\n                        INSERT INTO nodes_documentevent (public_id, action, created_at, old_data) VALUES (OLD.public_id, 'DELETE', NOW(), OLD.json);\n                    END IF;\n                    RETURN NEW;\n                    ",
                    hash="45b00b123156ce40fc8e826c9b79fa7407fb92a7",
                    operation="INSERT OR UPDATE OR DELETE",
                    pgid="pgtrigger_document_change_b3491",
                    table="nodes_document",
                    when="AFTER",
                ),
            ),
        ),
        migrations.AddIndex(
            model_name="project",
            index=models.Index(
                fields=["public_id"], name="nodes_proje_public__53dff1_idx"
            ),
        ),
    ]
