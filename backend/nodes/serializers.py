import typing
import uuid

from drf_spectacular.utils import extend_schema_field
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
    has_subnodes = serializers.BooleanField(read_only=True)

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Node
        exclude = None  # To override the `exclude` from the base class
        fields = ["id", "title_token_count", "text_token_count", "has_subnodes"]


class NodeDetailSerializer(NodeListSerializer):
    subnodes = NodeListSerializer(many=True, read_only=True, source="available_subnodes")

    class Meta(NodeListSerializer.Meta):
        fields = NodeListSerializer.Meta.fields + ["subnodes"]

    def get_fields(self):
        fields = super().get_fields()
        if self.context.get("request") and self.context["request"].query_params.get(
            "show_permissions"
        ):
            fields["allowed_actions"] = serializers.SerializerMethodField()
        return fields

    def get_allowed_actions(self, obj: AnnotatedNode) -> list[permissions.models.Action]:
        return obj.space.get_allowed_actions_for_user(self.context["request"])


class NodeSearchResultSerializer(utils.serializers.BaseSoftDeletableSerializer[models.Node]):
    space = utils.serializers.PublicIdRelatedField(read_only=True)
    parents = utils.serializers.PublicIdRelatedField(many=True, read_only=True)

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Node
        exclude = (utils.serializers.BaseSoftDeletableSerializer.Meta.exclude or []) + [
            "content",
            "text",
            "graph_document",
            "editor_document",
            "subnodes",
        ]


@extend_schema_field(uuid.UUID)
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
    default_node = SpaceDefaultNodeField(
        allow_null=True,
        read_only=False,
        required=False,
        help_text=models.Space._meta.get_field("default_node").help_text,
    )
    node_count = serializers.IntegerField(read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    def get_allowed_actions(self, obj: models.Space) -> list[permissions.models.Action]:
        return obj.get_allowed_actions_for_user(self.context["request"])

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Space
        read_only_fields = ["default_node"]
        exclude = (utils.serializers.BaseSoftDeletableSerializer.Meta.exclude or []) + ["document"]


class DocumentVersionSerializer(
    utils.serializers.BaseSoftDeletableSerializer[models.DocumentVersion]
):
    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.DocumentVersion
        exclude = (utils.serializers.BaseSoftDeletableSerializer.Meta.exclude or []) + [
            "data",
            "json_hash",
        ]
