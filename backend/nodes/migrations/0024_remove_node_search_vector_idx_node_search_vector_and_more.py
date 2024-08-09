# Generated by Django 5.0.6 on 2024-05-20 13:25

import django.contrib.postgres.indexes
import django.contrib.postgres.search
import pgtrigger.compiler
import pgtrigger.migrations
from django.contrib.postgres.search import SearchVector
from django.db import migrations, models


def compute_search_vector(apps, schema_editor):
    Node = apps.get_model("nodes", "Node")
    Node.objects.update(
        search_vector=SearchVector(
            SearchVector("title", weight="A", config="english")
            + SearchVector("text", weight="C", config="english")
        )
    )


class Migration(migrations.Migration):
    dependencies = [
        ("nodes", "0023_node_search_vector_idx"),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name="node",
            name="search_vector_idx",
        ),
        migrations.AddField(
            model_name="node",
            name="search_vector",
            field=django.contrib.postgres.search.SearchVectorField(editable=False, null=True),
        ),
        migrations.AddIndex(
            model_name="node",
            index=django.contrib.postgres.indexes.GinIndex(
                models.F("search_vector"), name="search_vector_idx"
            ),
        ),
        pgtrigger.migrations.AddTrigger(
            model_name="node",
            trigger=pgtrigger.compiler.Trigger(
                name="node_update_search_vector",
                sql=pgtrigger.compiler.UpsertTriggerSql(
                    func="\n                    NEW.search_vector := setweight(to_tsvector('pg_catalog.english', coalesce(new.title,'')), 'A') || setweight(to_tsvector('pg_catalog.english', coalesce(new.text,'')), 'C');\n                    return NEW;\n                    ",
                    hash="82354f5c87a2762462bda0aa2fa55cb2761a9343",
                    operation="UPDATE OR INSERT",
                    pgid="pgtrigger_node_update_search_vector_401f5",
                    table="nodes_node",
                    when="BEFORE",
                ),
            ),
        ),
        migrations.RunPython(compute_search_vector, migrations.RunPython.noop),
    ]
