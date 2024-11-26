import typing

import dry_rest_permissions.generics as dry_permissions
import rest_framework.filters
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

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
    filterset_class = profiles.filters.ProfileFilterSet
    filter_backends = (
        profiles.filters.ProfilePermissionFilterBackend,
        utils.filters.BaseFilterBackend,
        rest_framework.filters.OrderingFilter,
    )
    permission_classes = (dry_permissions.DRYObjectPermissions,)
    allowed_methods = ("GET", "PATCH", "HEAD", "OPTIONS")
    ordering_fields = ("created",)

    def get_queryset(self) -> "django_models.QuerySet[profiles.models.Profile]":
        queryset = (
            profiles.models.Profile.objects.defer("profile_image_original", "banner_image_original")
            .select_related("user", "space")
            .prefetch_related("members")
        )
        return queryset

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-images",
        parser_classes=(MultiPartParser,),
    )
    def upload_images(self, request, public_id=None):
        profile = self.get_object()
        for key in ["profile_image", "banner_image"]:
            if key in request.FILES:
                setattr(profile, f"{key}_original", request.FILES[key])
        profile.save()
        return Response({"status": "success"})


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
    filterset_class = profiles.filters.ProfileCardFilterSet
    filter_backends = (
        profiles.filters.ProfileCardPermissionFilterBackend,
        utils.filters.BaseFilterBackend,
        rest_framework.filters.OrderingFilter,
    )
    permission_classes = (dry_permissions.DRYObjectPermissions,)
    ordering_fields = ("created",)

    def get_queryset(self) -> "django_models.QuerySet[profiles.models.ProfileCard]":
        return profiles.models.ProfileCard.objects.defer("image_original").select_related(
            "profile", "profile__space", "profile__user"
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-images",
        parser_classes=(MultiPartParser,),
    )
    def upload_images(self, request, public_id=None):
        profile_card = self.get_object()
        if "image" in request.FILES:
            profile_card.image_original = request.FILES["image"]
            profile_card.save()
        return Response({"status": "success"})
