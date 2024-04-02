import typing

from rest_framework import serializers

from nodes import models
from utils import serializers as coord_serializers

if typing.TYPE_CHECKING:
    from django.db import models as django_models


class NodeSerializer(coord_serializers.BaseSerializer):
    url = serializers.HyperlinkedIdentityField(
        view_name="nodes:nodes-detail", lookup_field="public_id"
    )

    class Meta(coord_serializers.BaseSerializer.Meta):
        model = models.Node


class NodeTokenSerializer(coord_serializers.BaseSerializer):
    url = serializers.HyperlinkedIdentityField(
        view_name="nodes:nodes-detail", lookup_field="public_id"
    )

    class Meta:
        model = models.Node
        fields = ("public_id", "title", "text_token_count", "title_token_count", "url")


class SpaceDefaultNodeField(serializers.HyperlinkedRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[models.Node]":
        space = self.root.instance
        if space is not None:
            return space.nodes.all()
        return models.Node.available_objects.none()


class SpaceSerializer(coord_serializers.BaseSerializer):
    # TODO: don't let the API client pick their own id for the project, it should be auto-generated.
    url = serializers.HyperlinkedIdentityField(
        view_name="nodes:spaces-detail", lookup_field="public_id"
    )
    nodes = NodeTokenSerializer(many=True, read_only=True)
    title_slug = serializers.SlugField(read_only=True)
    default_node = (
        SpaceDefaultNodeField(
            view_name="nodes:nodes-detail",
            lookup_field="public_id",
            allow_null=True,
            read_only=False,
            required=False,
        ),
    )

    class Meta(coord_serializers.BaseSerializer.Meta):
        model = models.Space


class DocumentVersionSerializer(coord_serializers.BaseSerializer):
    url = serializers.HyperlinkedIdentityField(
        view_name="nodes:document-versions-detail", lookup_field="public_id"
    )
    crdt = serializers.HyperlinkedIdentityField(
        view_name="nodes:document-versions-crdt", lookup_field="public_id"
    )

    class Meta(coord_serializers.BaseSerializer.Meta):
        model = models.DocumentVersion
        exclude = coord_serializers.BaseSerializer.Meta.exclude + ["data", "json_hash"]
