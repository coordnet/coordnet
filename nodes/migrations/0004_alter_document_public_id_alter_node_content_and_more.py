# Generated by Django 4.2.7 on 2024-03-12 11:50

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("nodes", "0003_node_subnodes"),
    ]

    operations = [
        migrations.AlterField(
            model_name="document",
            name="public_id",
            field=models.UUIDField(editable=False),
        ),
        migrations.AlterField(
            model_name="node",
            name="content",
            field=models.JSONField(null=True),
        ),
        migrations.AlterField(
            model_name="node",
            name="subnodes",
            field=models.ManyToManyField(
                blank=True, related_name="parents", to="nodes.node"
            ),
        ),
        migrations.AlterField(
            model_name="node",
            name="text",
            field=models.TextField(default=None, null=True),
        ),
        migrations.AlterField(
            model_name="node",
            name="text_token_count",
            field=models.PositiveIntegerField(null=True),
        ),
        migrations.AlterField(
            model_name="node",
            name="title",
            field=models.CharField(max_length=1024, null=True),
        ),
        migrations.AlterField(
            model_name="node",
            name="title_token_count",
            field=models.PositiveIntegerField(null=True),
        ),
    ]
