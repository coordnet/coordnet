import typing

from rest_framework import serializers

import permissions.models
from nodes import models
from utils import serializers as coord_serializers

if typing.TYPE_CHECKING:
    from django.db import models as django_models
    from django_stubs_ext import WithAnnotations

    class AvailableSubnodes(typing.TypedDict):
        available_subnodes: list[str]

    AnnotatedNode = WithAnnotations[models.Node, AvailableSubnodes]
else:
    AnnotatedNode = models.Node


class NodeSerializer(coord_serializers.BaseSerializer[models.Node]):
    url = serializers.HyperlinkedIdentityField(
        view_name="nodes:nodes-detail", lookup_field="public_id"
    )
    subnodes = serializers.SerializerMethodField()
    allowed_actions = serializers.SerializerMethodField()

    def get_allowed_actions(self, obj: models.Node) -> list[permissions.models.Action]:
        return obj.get_allowed_actions_for_user(self.context["request"])

    def get_subnodes(self, obj: AnnotatedNode) -> list[str]:
        return [str(item) for item in obj.available_subnodes]

    class Meta(coord_serializers.BaseSerializer.Meta):
        model = models.Node
        exclude = coord_serializers.BaseSerializer.Meta.exclude + [
            "graph_document",
            "editor_document",
        ]


class NodeTokenSerializer(coord_serializers.BaseSerializer[models.Node]):
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
            return space.nodes.filter(is_removed=False)
        return models.Node.available_objects.none()


class SpaceSerializer(coord_serializers.BaseSerializer[models.Space]):
    # TODO: don't let the API client pick their own id for the project, it should be auto-generated.
    url = serializers.HyperlinkedIdentityField(
        view_name="nodes:spaces-detail", lookup_field="public_id"
    )
    nodes = NodeTokenSerializer(many=True, read_only=True, source="available_nodes")
    title_slug = serializers.SlugField(read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    def get_allowed_actions(self, obj: models.Space) -> list[permissions.models.Action]:
        return obj.get_allowed_actions_for_user(self.context["request"])

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


class DocumentVersionSerializer(coord_serializers.BaseSerializer[models.DocumentVersion]):
    url = serializers.HyperlinkedIdentityField(
        view_name="nodes:document-versions-detail", lookup_field="public_id"
    )
    crdt = serializers.HyperlinkedIdentityField(
        view_name="nodes:document-versions-crdt", lookup_field="public_id"
    )

    class Meta(coord_serializers.BaseSerializer.Meta):
        model = models.DocumentVersion
        exclude = coord_serializers.BaseSerializer.Meta.exclude + ["data", "json_hash"]
