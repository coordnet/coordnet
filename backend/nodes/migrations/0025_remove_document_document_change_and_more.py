# Generated by Django 5.0.6 on 2024-05-28 10:34

import pgtrigger.compiler
import pgtrigger.migrations
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("nodes", "0024_remove_node_search_vector_idx_node_search_vector_and_more"),
    ]

    operations = [
        pgtrigger.migrations.RemoveTrigger(
            model_name="document",
            name="document_change",
        ),
        pgtrigger.migrations.RemoveTrigger(
            model_name="node",
            name="node_update_search_vector",
        ),
        pgtrigger.migrations.AddTrigger(
            model_name="document",
            trigger=pgtrigger.compiler.Trigger(
                name="document_change",
                sql=pgtrigger.compiler.UpsertTriggerSql(
                    func="\n                    IF (TG_OP = 'INSERT') THEN\n                        INSERT INTO nodes_documentevent (public_id, document_type, action, created_at, new_data) VALUES (NEW.public_id, NEW.document_type, 'INSERT', NOW(), NEW.json);\n                    ELSIF (TG_OP = 'UPDATE') THEN\n                        INSERT INTO nodes_documentevent (public_id, document_type, action, created_at, old_data, new_data) VALUES (NEW.public_id, NEW.document_type, 'UPDATE', NOW(), OLD.json, NEW.json);\n                    ELSIF (TG_OP = 'DELETE') THEN\n                        INSERT INTO nodes_documentevent (public_id, document_type, action, created_at, old_data) VALUES (OLD.public_id, OLD.document_type, 'DELETE', NOW(), OLD.json);\n                    END IF;\n                    NOTIFY nodes_document_change;\n                    RETURN NEW;\n                    ",
                    hash="72d59172a65ae5ec5dfc294c936b28ce3829b493",
                    operation="INSERT OR UPDATE OR DELETE",
                    pgid="pgtrigger_document_change_b3491",
                    table="nodes_document",
                    when="AFTER",
                ),
            ),
        ),
        pgtrigger.migrations.AddTrigger(
            model_name="node",
            trigger=pgtrigger.compiler.Trigger(
                name="node_update_search_vector",
                sql=pgtrigger.compiler.UpsertTriggerSql(
                    func="\n                    NEW.search_vector := setweight(to_tsvector('pg_catalog.english', coalesce(new.title,'')), 'A') || setweight(to_tsvector('pg_catalog.english', coalesce(new.text,'')), 'C');\n                    return NEW;\n                    ",
                    hash="d975148b92846353c59d471e83deb0229b8bc897",
                    operation="UPDATE OR INSERT",
                    pgid="pgtrigger_node_update_search_vector_401f5",
                    table="nodes_node",
                    when="BEFORE",
                ),
            ),
        ),
    ]
