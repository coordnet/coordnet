# Generated by Django 4.2.7 on 2024-03-12 17:30

from django.conf import settings
from django.db import migrations, models


def get_document_type(apps, schema_editor) -> None:
    DocumentEvent = apps.get_model("nodes", "DocumentEvent")

    for document_event in DocumentEvent.objects.all():
        document_data = document_event.new_data or document_event.old_data
        if document_data.get(settings.NODE_CRDT_KEY, {}).get("type") == "doc":
            document_event.document_type = "EDITOR"
        elif "nodes" in document_data and "edges" in document_data:
            document_event.document_type = "GRAPH"
        elif "nodes" in document_data and "deletedNodes" in document_data:
            document_event.document_type = "SPACE"
        else:
            document_event.document_type = "UNKNOWN"
        document_event.save()


class Migration(migrations.Migration):
    dependencies = [
        ("nodes", "0008_document_document_type_alter_document_public_id_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentevent",
            name="document_type",
            field=models.CharField(
                choices=[("EDITOR", "Editor"), ("SPACE", "Space"), ("GRAPH", "Graph")],
                default="asdf",
                max_length=255,
            ),
            preserve_default=False,
        ),
    ]
