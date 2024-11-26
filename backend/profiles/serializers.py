from rest_framework import serializers

import profiles.models
import utils.serializers


class ProfileCardSerializer(utils.serializers.BaseSerializer[profiles.models.ProfileCard]):
    profile = utils.serializers.PublicIdRelatedField(queryset=profiles.models.Profile.objects.all())

    image = serializers.ImageField(read_only=True)
    image_2x = serializers.ImageField(read_only=True)
    image_thumbnail = serializers.ImageField(read_only=True)
    image_thumbnail_2x = serializers.ImageField(read_only=True)

    class Meta(utils.serializers.BaseSerializer.Meta):
        model = profiles.models.ProfileCard
        exclude = (utils.serializers.BaseSerializer.Meta.exclude or []) + [
            "image_original",
            "created_by",
        ]
        read_only_fields = ["image", "image_2x", "image_thumbnail", "image_thumbnail_2x"]

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["created_by"] = request.user
        return super().create(validated_data)


class ProfileSerializer(utils.serializers.BaseSerializer[profiles.models.Profile]):
    space = utils.serializers.PublicIdRelatedField(read_only=True)
    user = utils.serializers.PublicIdRelatedField(read_only=True)

    object_created = serializers.DateTimeField(read_only=True, source="related_object.created")

    profile_image = serializers.ImageField(read_only=True)
    profile_image_2x = serializers.ImageField(read_only=True)
    banner_image = serializers.ImageField(read_only=True)
    banner_image_2x = serializers.ImageField(read_only=True)

    cards = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta(utils.serializers.BaseSerializer.Meta):
        model = profiles.models.Profile
        exclude = (utils.serializers.BaseSerializer.Meta.exclude or []) + [
            "profile_image_original",
            "banner_image_original",
        ]
        read_only_fields = ["profile_image", "profile_image_2x", "banner_image", "banner_image_2x"]

    def get_members(self, obj):
        request = self.context.get("request")
        return ProfileSerializer(obj.visible_members(request.user), many=True, read_only=True).data

    def get_cards(self, obj):
        request = self.context.get("request")
        return ProfileCardSerializer(
            obj.visible_cards(request.user), many=True, read_only=True
        ).data
