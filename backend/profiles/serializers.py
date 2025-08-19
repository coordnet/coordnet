import logging
import typing
import uuid

from django.db.models import Q
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

import nodes.models
import permissions.models
import profiles.models
import users.models
import utils.serializers
from utils.serializers import AvailableUserField
from profiles.validation import SocialMediaValidator

if typing.TYPE_CHECKING:
    from django.db import models as django_models


logger = logging.getLogger(__name__)


@extend_schema_field(uuid.UUID)
class AvailableSpaceProfileField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[profiles.models.Profile]":
        user = self.context["request"].user
        return profiles.models.Profile.objects.filter(
            nodes.models.Space.get_user_has_permission_filter(
                action=permissions.models.READ, user=user, prefix="space"
            )
            & Q(space__is_removed=False, space__isnull=False)
        ).distinct()

    def get_choices(self, cutoff: int | None = None) -> dict[str, str]:
        queryset = self.get_queryset()
        if queryset is None:
            # Ensure that field.choices returns something sensible
            # even when accessed with a read-only field.
            return {}

        if cutoff is not None:
            queryset = queryset[:cutoff]

        return {str(item.public_id): self.display_value(item) for item in queryset}

    def to_representation(self, value: "profiles.models.Profile") -> dict:  # type: ignore[override]
        # This field accepts ids for writing, but returns the rendered profile for reading
        return ReducedProfileSerializer(value).data

    def to_internal_value(self, data: str) -> "profiles.models.Profile":
        user = self.context["request"].user

        try:
            space_profile_id = uuid.UUID(data)
        except ValueError as exc:
            raise serializers.ValidationError("Invalid UUID format") from exc

        space_profile = (
            profiles.models.Profile.objects.filter(
                nodes.models.Space.get_user_has_permission_filter(
                    action=permissions.models.READ, user=user, prefix="space"
                ),
                public_id=space_profile_id,
                space__isnull=False,
                space__is_removed=False,
            )
            .distinct()
            .first()
        )

        if not space_profile:
            raise serializers.ValidationError("Space profile not found")

        return space_profile


@extend_schema_field(uuid.UUID)
class AvailableUserProfileField(utils.serializers.PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[profiles.models.Profile]":
        return profiles.models.Profile.objects.filter(
            Q(draft=False) | Q(user=self.context["request"].user), user__isnull=False
        )

    def get_choices(self, cutoff: int | None = None) -> dict[str, str]:
        queryset = self.get_queryset()
        if queryset is None:
            # Ensure that field.choices returns something sensible
            # even when accessed with a read-only field.
            return {}

        if cutoff is not None:
            queryset = queryset[:cutoff]

        return {str(item.public_id): self.display_value(item) for item in queryset}

    def to_representation(self, value: "profiles.models.Profile") -> dict:  # type: ignore[override]
        # This field accepts ids for writing, but returns the rendered profile for reading
        return ReducedProfileSerializer(value).data

    def to_internal_value(self, data: str) -> "profiles.models.Profile":
        try:
            user_profile_id = uuid.UUID(data)
        except ValueError as exc:
            raise serializers.ValidationError("Invalid UUID format") from exc

        try:
            return profiles.models.Profile.objects.get(
                Q(
                    draft=False,
                    user__pk=self.context["request"].user.pk,
                    public_id=user_profile_id,
                    user__isnull=False,
                )
            )
        except profiles.models.Profile.DoesNotExist as exc:
            raise serializers.ValidationError("User profile not found") from exc


@extend_schema_field(uuid.UUID)
class AvailableUserProfileForUserField(utils.serializers.PublicIdRelatedField):
    """
    This is used on methods, where the relation is a User, but the rendered return content is a
    Profile.
    """

    def get_queryset(self) -> "django_models.QuerySet[users.models.User]":
        return users.models.User.objects.filter(
            Q(profile__draft=False) | Q(pk=self.context["request"].user.pk)
        )

    def get_choices(self, cutoff: int | None = None) -> dict[str, str]:
        queryset = self.get_queryset()
        if queryset is None:
            # Ensure that field.choices returns something sensible
            # even when accessed with a read-only field.
            return {}

        if cutoff is not None:
            queryset = queryset[:cutoff]

        return {str(item.public_id): self.display_value(item) for item in queryset}

    def to_representation(self, value: "users.models.User") -> dict:  # type: ignore[override]
        return ReducedProfileSerializer(value.profile).data

    def to_internal_value(self, data: str) -> "users.models.User":
        try:
            user_profile_id = uuid.UUID(data)
        except ValueError as exc:
            raise serializers.ValidationError("Invalid UUID format") from exc

        try:
            return users.models.User.objects.get(
                Q(profile__draft=False) | Q(pk=self.context["request"].user.pk),
                profile__public_id=user_profile_id,
            )
        except users.models.User.DoesNotExist as exc:
            raise serializers.ValidationError("User profile not found") from exc


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

    def create(self, validated_data: dict[str, typing.Any]) -> "profiles.models.ProfileCard":
        if (request := self.context.get("request")) is not None:
            validated_data["created_by"] = request.user
        else:
            logger.warning("Request not found in context, not setting created_by")
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
    def to_representation(self, value: "list[profiles.models.Profile]") -> dict:  # type: ignore[override]
        # This field accepts ids for writing, but returns the rendered profile for reading
        return ReducedProfileSerializer(value, many=True, read_only=True).data

    def to_internal_value(  # type: ignore[override]
        self, data: list[str]
    ) -> "django_models.QuerySet[profiles.models.Profile]":
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
    def to_representation(self, value: "list[profiles.models.ProfileCard]") -> dict:  # type: ignore[override]
        # This field accepts ids for writing, but returns the rendered profile for reading
        return ProfileCardSerializer(value, many=True, read_only=True).data

    def to_internal_value(  # type: ignore[override]
        self, data: list[str]
    ) -> "django_models.QuerySet[profiles.models.ProfileCard]":
        if not isinstance(data, list):
            raise serializers.ValidationError("Expected a list of UUIDs")
        try:
            card_ids = {uuid.UUID(card_id) for card_id in data}
        except ValueError as exc:
            raise serializers.ValidationError("Invalid UUID format") from exc

        filter_expression = Q(draft=False)
        if (
            (request := self.context.get("request"))
            and (user := request.user)
            and user.is_authenticated
        ):
            filter_expression |= Q(created_by=user) | Q(author_profile__user=user)

        cards = (
            profiles.models.ProfileCard.objects.filter(public_id__in=card_ids)
            .filter(filter_expression)
            .distinct()
        )
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

    def validate_telegram_url(self, value: str) -> str:
        """Validate Telegram URL format"""
        return SocialMediaValidator.validate_url(value, 'telegram_url')
    
    def validate_bluesky_url(self, value: str) -> str:
        """Validate Bluesky URL format"""
        return SocialMediaValidator.validate_url(value, 'bluesky_url')
    
    def validate_twitter_url(self, value: str) -> str:
        """Validate Twitter/X URL format"""
        return SocialMediaValidator.validate_url(value, 'twitter_url')

    def update(
        self, instance: "profiles.models.Profile", validated_data: dict
    ) -> "profiles.models.Profile":
        if (members := validated_data.pop("members", None)) is not None:
            instance.members.set(members)
        if (cards := validated_data.pop("cards", None)) is not None:
            instance.cards.set(cards)
        return super().update(instance, validated_data)
