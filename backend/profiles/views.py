import typing

import dry_rest_permissions.generics as dry_permissions
from drf_spectacular.utils import extend_schema, extend_schema_view

import profiles.filters
import profiles.models
import utils.filters
import utils.views
from profiles import serializers

if typing.TYPE_CHECKING:
    from django.db import models as django_models


@extend_schema(
    tags=["Profiles"],
)
@extend_schema_view(
    list=extend_schema(description="List available profiles.", summary="List profiles"),
    retrieve=extend_schema(description="Retrieve a single profile.", summary="Retrieve a profile"),
)
class ProfileModelViewSet(utils.views.BaseModelViewSet[profiles.models.Profile]):
    serializer_class = serializers.ProfileSerializer
    filterset_fields = ("space", "user")
    filter_backends = (
        profiles.filters.ProfilePermissionFilterBackend,
        utils.filters.BaseFilterBackend,
    )
    permission_classes = (dry_permissions.DRYObjectPermissions,)
    allowed_methods = ("GET", "PATCH", "HEAD", "OPTIONS")

    def get_queryset(self) -> "django_models.QuerySet[profiles.models.Profile]":
        queryset = (
            profiles.models.Profile.objects.defer("profile_image_original", "banner_image_original")
            .select_related("user", "space")
            .prefetch_related("members")
        )
        return queryset


@extend_schema(
    tags=["Profiles"],
)
@extend_schema_view(
    list=extend_schema(description="List available profile cards.", summary="List profile cards"),
    retrieve=extend_schema(
        description="Retrieve a single profile card.", summary="Retrieve a profile card"
    ),
)
class ProfileCardModelViewSet(utils.views.BaseModelViewSet[profiles.models.ProfileCard]):
    serializer_class = serializers.ProfileCardSerializer
    filterset_fields = ("profile",)
    filter_backends = (
        profiles.filters.ProfileCardPermissionFilterBackend,
        utils.filters.BaseFilterBackend,
    )
    permission_classes = (dry_permissions.DRYObjectPermissions,)

    def get_queryset(self) -> "django_models.QuerySet[profiles.models.ProfileCard]":
        return profiles.models.ProfileCard.objects.defer("image_original").select_related(
            "profile", "profile__space", "profile__user"
        )
