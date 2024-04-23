import typing

from rest_framework import serializers

import permissions.models
from nodes import models
from utils import serializers as coord_serializers

if typing.TYPE_CHECKING:
    from django.db import models as django_models
    from django_stubs_ext import WithAnnotations

    class AvailableSubnodes(typing.TypedDict, total=False):
        available_subnodes: list[str]

    AnnotatedNode = WithAnnotations[models.Node, AvailableSubnodes]
else:
    AnnotatedNode = models.Node


class NodeSerializer(coord_serializers.BaseSoftDeletableSerializer[models.Node]):
    url = serializers.HyperlinkedIdentityField(
        view_name="nodes:nodes-detail", lookup_field="public_id"
    )
    subnodes = serializers.SerializerMethodField()
    allowed_actions = serializers.SerializerMethodField()

    def get_allowed_actions(self, obj: models.Node) -> list[permissions.models.Action]:
        return obj.get_allowed_actions_for_user(self.context["request"])

    def get_subnodes(self, obj: AnnotatedNode) -> list[str]:
        return [str(item) for item in obj.available_subnodes]

    class Meta(coord_serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Node
        exclude = coord_serializers.BaseSoftDeletableSerializer.Meta.exclude + ["content", "text", "graph_document",
            "editor_document",]


class SpaceDefaultNodeField(coord_serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[models.Node]":
        space = self.root.instance
        if space is not None:
            return space.nodes.filter(is_removed=False)
        return models.Node.available_objects.none()


class SpaceSerializer(coord_serializers.BaseSoftDeletableSerializer[models.Space]):
    # TODO: don't let the API client pick their own id for the project, it should be auto-generated.
    title_slug = serializers.SlugField(read_only=True)
    default_node = SpaceDefaultNodeField(allow_null=True, read_only=False, required=False)
    allowed_actions = serializers.SerializerMethodField()

    def get_allowed_actions(self, obj: models.Space) -> list[permissions.models.Action]:
        return obj.get_allowed_actions_for_user(self.context["request"])

    class Meta(coord_serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Space
        read_only_fields = ["nodes", "default_node"]


class DocumentVersionSerializer(
    coord_serializers.BaseSoftDeletableSerializer[models.DocumentVersion]
):
    class Meta(coord_serializers.BaseSoftDeletableSerializer.Meta):
        model = models.DocumentVersion
        exclude = coord_serializers.BaseSoftDeletableSerializer.Meta.exclude + ["data", "json_hash"]
