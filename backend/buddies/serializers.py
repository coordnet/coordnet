import adrf.serializers
from rest_framework import serializers

from buddies import models
from nodes import models as node_models
from utils import serializers as coord_serializers


class BuddySerializer(coord_serializers.BaseSoftDeletableSerializer[models.Buddy]):
    url = serializers.HyperlinkedIdentityField(
        view_name="buddies:buddies-detail", lookup_field="public_id"
    )

    class Meta(coord_serializers.BaseSoftDeletableSerializer.Meta):
        model = models.Buddy


class BuddyQuerySerializer(serializers.Serializer):
    message = serializers.CharField(
        allow_blank=True, required=False, help_text="Message sent to the buddy"
    )
    nodes = coord_serializers.PublicIdRelatedField(
        queryset=node_models.Node.available_objects.all(),
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
