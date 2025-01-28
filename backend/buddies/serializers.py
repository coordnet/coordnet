import typing
import uuid

import adrf.serializers
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

import nodes.models
import utils.serializers
from buddies import models

if typing.TYPE_CHECKING:
    import django.db.models as django_models


@extend_schema_field(uuid.UUID)
class AvailableBuddyField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[models.Buddy]":
        return models.Buddy.available_objects.distinct()


class BuddySerializer(utils.serializers.BaseSoftDeletableSerializer[models.Buddy]):
    url = serializers.HyperlinkedIdentityField(
        view_name="buddies:buddies-detail", lookup_field="public_id"
    )

    class Meta(utils.serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Buddy


class BuddyQuerySerializer(serializers.Serializer):
    message = serializers.CharField(
        allow_blank=True, required=False, help_text="Message sent to the buddy"
    )
    nodes = utils.serializers.PublicIdRelatedField(
        queryset=nodes.models.Node.available_objects.all(),
        many=True,
        allow_empty=False,
        help_text="List of nodes to use as context",
    )
    level = serializers.IntegerField(required=False, help_text="Level of depth to query the nodes")


class OpenAIQuerySerializer(adrf.serializers.Serializer):
    messages = serializers.ListField(child=serializers.DictField(), help_text="List of messages")
    model = serializers.CharField(help_text="OpenAI model")
    stream = serializers.BooleanField(default=True, help_text="Stream the response")
    tool_choice = serializers.DictField()
    tools = serializers.ListField(child=serializers.DictField())
