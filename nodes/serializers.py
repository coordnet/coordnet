from rest_framework import serializers

from nodes import models
from utils import serializers as coord_serializers


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


class SpaceSerializer(coord_serializers.BaseSerializer):
    # TODO: don't let the API client pick their own id for the project, it should be auto-generated.
    url = serializers.HyperlinkedIdentityField(
        view_name="nodes:spaces-detail", lookup_field="public_id"
    )
    nodes = NodeTokenSerializer(many=True, read_only=True)
    title_slug = serializers.SlugField(read_only=True)

    class Meta(coord_serializers.BaseSerializer.Meta):
        model = models.Space
        depth = 2
