from rest_framework import serializers

from buddies import models
from nodes import models as node_models
from utils import serializers as coord_serializers


class BuddySerializer(coord_serializers.BaseSerializer):
    url = serializers.HyperlinkedIdentityField(
        view_name="buddies:buddies-detail", lookup_field="public_id"
    )

    class Meta(coord_serializers.BaseSerializer.Meta):
        model = models.Buddy


class BuddyQuerySerializer(serializers.Serializer):
    message = serializers.CharField(allow_blank=True, required=False)
    node = coord_serializers.PublicIdRelatedField(queryset=node_models.Node.available_objects.all())
    level = serializers.IntegerField(required=False)
