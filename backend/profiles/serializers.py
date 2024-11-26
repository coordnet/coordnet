from rest_framework import serializers

import profiles.models
import utils.serializers


class ProfileCardSerializer(utils.serializers.BaseSerializer[profiles.models.ProfileCard]):
    profile = utils.serializers.PublicIdRelatedField(queryset=profiles.models.Profile.objects.all())

    class Meta(utils.serializers.BaseSerializer.Meta):
        model = profiles.models.ProfileCard
        exclude = (utils.serializers.BaseSerializer.Meta.exclude or []) + ["image_original"]
        read_only_fields = ["image", "image_thumbnail"]


class ProfileSerializer(utils.serializers.BaseSerializer[profiles.models.Profile]):
    space = utils.serializers.PublicIdRelatedField(read_only=True)
    user = utils.serializers.PublicIdRelatedField(read_only=True)

    cards = ProfileCardSerializer(many=True, read_only=True)

    object_created = serializers.DateTimeField(read_only=True, source="related_object.created")

    members = serializers.SerializerMethodField()

    class Meta(utils.serializers.BaseSerializer.Meta):
        model = profiles.models.Profile
        exclude = (utils.serializers.BaseSerializer.Meta.exclude or []) + [
            "profile_image_original",
            "banner_image_original",
        ]
        read_only_fields = ["profile_image", "banner_image"]

    def get_members(self, obj):
        return ProfileSerializer(obj.members.filter(is_public=True), many=True, read_only=True).data
