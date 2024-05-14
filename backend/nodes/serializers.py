import typing

from rest_framework import serializers

import permissions.models
import utils.serializers
from nodes import models

if typing.TYPE_CHECKING:
    from django.db import models as django_models
    from django_stubs_ext import WithAnnotations

    class AvailableSubnodes(typing.TypedDict, total=False):
        available_subnodes: django_models.QuerySet[models.Node]

    AnnotatedNode = WithAnnotations[models.Node, AvailableSubnodes]
else:
    AnnotatedNode = models.Node


class NodeListSerializer(utils.serializers.BaseSoftDeletableSerializer[models.Node]):
    allowed_actions = serializers.SerializerMethodField()
    subnode_count = serializers.IntegerField(read_only=True)

    def get_allowed_actions(self, obj: models.Node) -> list[permissions.models.Action]:
        return obj.get_allowed_actions_for_user(self.context["request"])

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Node
        exclude = None  # To override the `exclude` from the base class
        fields = ["id", "title_token_count", "text_token_count", "allowed_actions", "subnode_count"]


class NodeDetailSerializer(NodeListSerializer):
    subnodes = NodeListSerializer(many=True, read_only=True, source="available_subnodes")

    class Meta(NodeListSerializer.Meta):
        fields = NodeListSerializer.Meta.fields + ["subnodes"]


class NodeSearchResultSerializer(utils.serializers.BaseSoftDeletableSerializer[models.Node]):
    spaces = utils.serializers.PublicIdRelatedField(many=True, read_only=True)
    parents = utils.serializers.PublicIdRelatedField(many=True, read_only=True)

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Node
        exclude = (utils.serializers.BaseSoftDeletableSerializer.Meta.exclude or []) + [
            "content",
            "text",
            "graph_document",
            "editor_document",
            "subnodes",
            "is_public",
            "is_public_writable",
        ]


class AvailableSpaceField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[models.Space]":
        user = self.context["request"].user
        return models.Space.available_objects.filter(
            models.Space.get_user_has_permission_filter(action=permissions.models.READ, user=user)
        )


class NodeSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=True)
    space = AvailableSpaceField(required=False)


class SpaceDefaultNodeField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[models.Node]":
        space = self.root.instance
        if space is not None:
            return space.nodes.filter(is_removed=False)
        return models.Node.available_objects.none()


class SpaceSerializer(utils.serializers.BaseSoftDeletableSerializer[models.Space]):
    # TODO: don't let the API client pick their own id for the project, it should be auto-generated.
    title_slug = serializers.SlugField(read_only=True)
    default_node = SpaceDefaultNodeField(allow_null=True, read_only=False, required=False)
    node_count = serializers.IntegerField(read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    def get_allowed_actions(self, obj: models.Space) -> list[permissions.models.Action]:
        return obj.get_allowed_actions_for_user(self.context["request"])

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Space
        read_only_fields = ["default_node"]
        exclude = (utils.serializers.BaseSoftDeletableSerializer.Meta.exclude or []) + [
            "nodes",
            "deleted_nodes",
            "document",
        ]


class DocumentVersionSerializer(
    utils.serializers.BaseSoftDeletableSerializer[models.DocumentVersion]
):
    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.DocumentVersion
        exclude = (utils.serializers.BaseSoftDeletableSerializer.Meta.exclude or []) + [
            "data",
            "json_hash",
        ]
