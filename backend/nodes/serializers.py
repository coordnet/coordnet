import typing
import uuid

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

import buddies.serializers
import permissions.models
import permissions.utils
import profiles.serializers
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
    image = serializers.ImageField(read_only=True)
    image_2x = serializers.ImageField(read_only=True)
    image_thumbnail = serializers.ImageField(read_only=True)
    image_thumbnail_2x = serializers.ImageField(read_only=True)

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Node
        exclude = None  # To override the `exclude` from the base class
        fields = [
            "id",
            "title_token_count",
            "text_token_count",
            "has_subnodes",
            "image",
            "image_2x",
            "image_thumbnail",
            "image_thumbnail_2x",
        ]


class NodeDetailSerializer(NodeListSerializer):
    subnodes = NodeListSerializer(many=True, read_only=True, source="available_subnodes")

    class Meta(NodeListSerializer.Meta):
        fields = NodeListSerializer.Meta.fields + ["subnodes"]

    def get_fields(self) -> dict[str, serializers.Field]:
        fields = super().get_fields()
        if self.context.get("request") and self.context["request"].query_params.get(
            "show_permissions"
        ):
            fields["allowed_actions"] = serializers.SerializerMethodField()
        return fields

    def get_allowed_actions(self, obj: AnnotatedNode) -> list[permissions.models.Action]:
        try:
            if self.context.get("request") and self.context["request"].user and obj.space:
                return obj.space.get_allowed_actions_for_user(user=self.context["request"].user)
        except models.Space.DoesNotExist:
            return []
        return []


class NodeSearchResultSerializer(utils.serializers.BaseSoftDeletableSerializer[models.Node]):
    space = utils.serializers.PublicIdRelatedField(read_only=True)
    parents = utils.serializers.PublicIdRelatedField(many=True, read_only=True)
    image = serializers.ImageField(read_only=True)
    image_2x = serializers.ImageField(read_only=True)
    image_thumbnail = serializers.ImageField(read_only=True)
    image_thumbnail_2x = serializers.ImageField(read_only=True)

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Node
        exclude = (utils.serializers.BaseSoftDeletableSerializer.Meta.exclude or []) + [
            "content",
            "text",
            "graph_document",
            "editor_document",
            "subnodes",
            "image_original",
        ]


@extend_schema_field(uuid.UUID)
class AvailableSpaceField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[models.Space]":
        user = self.context["request"].user
        return models.Space.available_objects.filter(
            models.Space.get_user_has_permission_filter(action=permissions.models.READ, user=user)
        ).distinct()


@extend_schema_field(uuid.UUID)
class AvailableMethodField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[models.MethodNode]":
        user = self.context["request"].user
        return models.MethodNode.available_objects.filter(
            models.MethodNode.get_user_has_permission_filter(
                action=permissions.models.READ, user=user
            )
        ).distinct()


@extend_schema_field(uuid.UUID)
class AvailableMethodNodeVersionField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[models.MethodNodeVersion]":
        user = self.context["request"].user
        return models.MethodNodeVersion.available_objects.filter(
            models.MethodNode.get_user_has_permission_filter(
                action=permissions.models.READ, user=user, prefix="method"
            )
        ).distinct()


class NodeSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=True)
    space = AvailableSpaceField(required=False)
    node_type = serializers.ChoiceField(required=False, choices=models.NodeType.choices)


class SpaceDefaultNodeField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[models.Node]":
        space = self.root.instance
        if space is not None:
            return space.nodes.filter(is_removed=False)
        return models.Node.available_objects.none()


class SpaceSerializer(utils.serializers.BaseSoftDeletableSerializer[models.Space]):
    # TODO: don't let the API client pick their own id for the project, it should be auto-generated.
    default_node = SpaceDefaultNodeField(
        allow_null=True,
        read_only=False,
        required=False,
        help_text=models.Space._meta.get_field("default_node").help_text,
    )
    node_count = serializers.IntegerField(read_only=True)
    allowed_actions = serializers.SerializerMethodField()

    def get_allowed_actions(self, obj: models.Space) -> list[permissions.models.Action]:
        return obj.get_allowed_actions_for_user(user=self.context["request"].user)

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


class MethodNodeListSerializer(utils.serializers.BaseSoftDeletableSerializer[models.MethodNode]):
    creator = profiles.serializers.AvailableUserProfileForUserField(read_only=True)
    authors = profiles.serializers.AvailableUserProfileForUserField(many=True)
    image = serializers.ImageField(read_only=True)
    image_2x = serializers.ImageField(read_only=True)
    image_thumbnail = serializers.ImageField(read_only=True)
    image_thumbnail_2x = serializers.ImageField(read_only=True)
    buddy = buddies.serializers.AvailableBuddyField(required=False, allow_null=True)

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.MethodNode
        read_only_fields = [
            "node_type",
            "title_token_count",
            "text_token_count",
            "description_token_count",
            "has_subnodes",
            "creator",
        ]

        exclude = (utils.serializers.BaseSoftDeletableSerializer.Meta.exclude or []) + [
            "content",
            "text",
            "graph_document",
            "editor_document",
            "forked_from",
            "image_original",
            "subnodes",
            "search_vector",
        ]

    def create(self, validated_data: dict[str, typing.Any]) -> models.MethodNode:
        user = self.context["request"].user
        validated_data["creator"] = user
        validated_data["authors"] = list(set(validated_data.get("authors", [user])))

        obj = super().create(validated_data)

        # Create corresponding permissions for the creator.
        obj.members.create(user=user, role=permissions.utils.get_owner_role())

        return obj


class MethodNodeDetailSerializer(MethodNodeListSerializer):
    def get_fields(self) -> dict[str, serializers.Field]:
        fields = super().get_fields()
        if self.context.get("request") and self.context["request"].query_params.get(
            "show_permissions"
        ):
            fields["allowed_actions"] = serializers.SerializerMethodField()
        return fields

    def get_allowed_actions(self, obj: models.MethodNode) -> list[permissions.models.Action]:
        return obj.get_allowed_actions_for_user(user=self.context["request"].user)


class MethodNodeRunListSerializer(utils.serializers.BaseSoftDeletableSerializer):
    space = AvailableSpaceField(required=False, allow_null=True)
    method = AvailableMethodField(required=True)
    method_version = AvailableMethodNodeVersionField(required=False, allow_null=True)
    method_data = serializers.JSONField(required=True, write_only=True)

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.MethodNodeRun
        create_only_fields = ["method", "method_version", "space", "method_data", "is_dev_run"]
        exclude = (utils.serializers.BaseSoftDeletableSerializer.Meta.exclude or []) + ["user"]

    def create(self, validated_data: dict[str, typing.Any]) -> models.MethodNodeRun:
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class MethodNodeRunDetailSerializer(MethodNodeRunListSerializer):
    method_data = serializers.JSONField(required=True)


class MethodNodeVersionListSerializer(
    utils.serializers.BaseSoftDeletableSerializer[models.MethodNodeVersion]
):
    method_data = serializers.JSONField(required=True, write_only=True)
    method = AvailableMethodField(required=True)

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.MethodNodeVersion
        exclude = (utils.serializers.BaseSoftDeletableSerializer.Meta.exclude or []) + [
            "node_type",
            "search_vector",
            "image_original",
        ]
        create_only_fields = ["method", "method_data"]
        read_only_fields = [
            "node_type",
            "title",
            "title_token_count",
            "description",
            "description_token_count",
            "content",
            "text",
            "text_token_count",
            "creator",
            "authors",
            "space",
            "image_original",
            "search_vector",
            "version",
            "buddy",
        ]

    def create(self, validated_data: dict[str, typing.Any]) -> models.MethodNodeVersion:
        # Copy contents of the Method over to the MethodNodeVersion object to be created.
        method = validated_data["method"]

        # Get the latest version of the method and increment it by 1.
        latest_version = method.versions.aggregate(version_max=models.models.Max("version"))[
            "version_max"
        ]
        validated_data["version"] = latest_version + 1 if latest_version is not None else 1

        validated_data["title"] = method.title
        validated_data["title_token_count"] = method.title_token_count
        validated_data["description"] = method.description
        validated_data["description_token_count"] = method.description_token_count
        validated_data["content"] = method.content
        validated_data["text"] = method.text
        validated_data["text_token_count"] = method.text_token_count
        validated_data["node_type"] = method.node_type
        validated_data["creator"] = method.creator
        validated_data["authors"] = method.authors.all()
        validated_data["space"] = method.space
        validated_data["image_original"] = method.image_original
        validated_data["search_vector"] = method.search_vector
        validated_data["buddy"] = method.buddy
        return super().create(validated_data)


class MethodNodeVersionDetailSerializer(MethodNodeVersionListSerializer):
    method_data = serializers.JSONField(required=True)
