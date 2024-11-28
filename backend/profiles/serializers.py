import typing
import uuid

import django.contrib.auth
from django.db.models import Q
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

import nodes.models
import permissions.models
import profiles.models
import utils.serializers

if typing.TYPE_CHECKING:
    from django.db import models as django_models


@extend_schema_field(uuid.UUID)
class AvailableSpaceProfileField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[profiles.models.Profile]":
        user = self.context["request"].user
        return profiles.models.Profile.objects.filter(
            nodes.models.Space.get_user_has_permission_filter(
                action=permissions.models.READ, user=user, prefix="space"
            )
            & Q(space__is_removed=False, space__isnull=False)
        )

    def get_choices(self, cutoff=None):
        queryset = self.get_queryset()
        if queryset is None:
            # Ensure that field.choices returns something sensible
            # even when accessed with a read-only field.
            return {}

        if cutoff is not None:
            queryset = queryset[:cutoff]

        return {str(item.public_id): self.display_value(item) for item in queryset}

    def to_representation(self, value):
        return ReducedProfileSerializer(value).data

    def to_internal_value(self, data):
        user = self.context["request"].user

        try:
            space_profile_id = uuid.UUID(data)
        except ValueError as exc:
            raise serializers.ValidationError("Invalid UUID format") from exc

        try:
            return profiles.models.Profile.objects.get(
                nodes.models.Space.get_user_has_permission_filter(
                    action=permissions.models.READ, user=user, prefix="space"
                ),
                public_id=space_profile_id,
                space__isnull=False,
                space__is_removed=False,
            )
        except profiles.models.Profile.DoesNotExist as exc:
            raise serializers.ValidationError("Space profile not found") from exc


@extend_schema_field(uuid.UUID)
class AvailableUserProfileField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[profiles.models.Profile]":
        return profiles.models.Profile.objects.filter(draft=False, user__isnull=False)

    def get_choices(self, cutoff=None):
        queryset = self.get_queryset()
        if queryset is None:
            # Ensure that field.choices returns something sensible
            # even when accessed with a read-only field.
            return {}

        if cutoff is not None:
            queryset = queryset[:cutoff]

        return {str(item.public_id): self.display_value(item) for item in queryset}

    def to_representation(self, value):
        return ReducedProfileSerializer(value).data

    def to_internal_value(self, data):
        print(data)
        try:
            user_profile_id = uuid.UUID(data)
        except ValueError as exc:
            raise serializers.ValidationError("Invalid UUID format") from exc

        try:
            return profiles.models.Profile.objects.get(
                public_id=user_profile_id, draft=False, user__isnull=False
            )
        except profiles.models.Profile.DoesNotExist as exc:
            raise serializers.ValidationError("User profile not found") from exc


@extend_schema_field(uuid.UUID)
class AvailableUserField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[django_models.User]":
        user = self.context["request"].user
        filter_expression = Q(profile__draft=False)
        if user.is_authenticated:
            filter_expression |= Q(pk=user.pk)
        return django.contrib.auth.get_user_model().objects.filter(filter_expression)


class ProfileCardSerializer(utils.serializers.BaseSerializer[profiles.models.ProfileCard]):
    image = serializers.ImageField(read_only=True)
    image_2x = serializers.ImageField(read_only=True)
    image_thumbnail = serializers.ImageField(read_only=True)
    image_thumbnail_2x = serializers.ImageField(read_only=True)

    space_profile = AvailableSpaceProfileField(required=False, allow_null=True)
    author_profile = AvailableUserProfileField(required=False, allow_null=True)
    created_by = AvailableUserField(read_only=True)

    class Meta(utils.serializers.BaseSerializer.Meta):
        model = profiles.models.ProfileCard
        exclude = (utils.serializers.BaseSerializer.Meta.exclude or []) + ["image_original"]
        read_only_fields = ["image", "image_2x", "image_thumbnail", "image_thumbnail_2x"]

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["created_by"] = request.user
        return super().create(validated_data)


class ReducedProfileSerializer(utils.serializers.BaseSerializer[profiles.models.Profile]):
    profile_image = serializers.ImageField(read_only=True)
    profile_image_2x = serializers.ImageField(read_only=True)

    class Meta(utils.serializers.BaseSerializer.Meta):
        model = profiles.models.Profile
        exclude = (utils.serializers.BaseSerializer.Meta.exclude or []) + [
            "profile_image_original",
            "banner_image_original",
            "description",
            "draft",
            "website",
            "telegram_url",
            "twitter_url",
            "bluesky_url",
            "eth_address",
            "cards",
            "members",
        ]
        read_only_fields = ["profile_image", "profile_image_2x"]


class MembersField(serializers.ListField):
    def to_representation(self, value):
        return ReducedProfileSerializer(value, many=True, read_only=True).data

    def to_internal_value(self, data):
        if not isinstance(data, list):
            raise serializers.ValidationError("Expected a list of UUIDs")
        try:
            user_ids = {uuid.UUID(user_id) for user_id in data}
        except ValueError as exc:
            raise serializers.ValidationError("Invalid UUID format") from exc

        users = profiles.models.Profile.objects.filter(
            public_id__in=user_ids, draft=False, user__isnull=False
        )
        if len(users) != len(user_ids):
            raise serializers.ValidationError("Some users not found")
        return users


class CardsField(serializers.ListField):
    def to_representation(self, value):
        return ProfileCardSerializer(value, many=True, read_only=True).data

    def to_internal_value(self, data):
        if not isinstance(data, list):
            raise serializers.ValidationError("Expected a list of UUIDs")
        try:
            card_ids = {uuid.UUID(user_id) for user_id in data}
        except ValueError as exc:
            raise serializers.ValidationError("Invalid UUID format") from exc

        cards = profiles.models.ProfileCard.objects.filter(public_id__in=card_ids, draft=False)
        if len(cards) != len(card_ids):
            raise serializers.ValidationError("Some cards not found")
        return cards


class ProfileSerializer(utils.serializers.BaseSerializer[profiles.models.Profile]):
    space = utils.serializers.PublicIdRelatedField(read_only=True)
    user = utils.serializers.PublicIdRelatedField(read_only=True)

    object_created = serializers.DateTimeField(
        read_only=True, source="related_object_creation_date"
    )

    profile_image = serializers.ImageField(read_only=True)
    profile_image_2x = serializers.ImageField(read_only=True)
    banner_image = serializers.ImageField(read_only=True)
    banner_image_2x = serializers.ImageField(read_only=True)

    cards = CardsField(required=False)
    members = MembersField(required=False)

    class Meta(utils.serializers.BaseSerializer.Meta):
        model = profiles.models.Profile
        exclude = (utils.serializers.BaseSerializer.Meta.exclude or []) + [
            "profile_image_original",
            "banner_image_original",
        ]
        read_only_fields = ["profile_image", "profile_image_2x", "banner_image", "banner_image_2x"]

    def update(self, instance, validated_data):
        if (members := validated_data.pop("members", None)) is not None:
            instance.members.set(members)
        if (cards := validated_data.pop("cards", None)) is not None:
            instance.cards.set(cards)
        return super().update(instance, validated_data)
