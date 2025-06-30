import typing

import dry_rest_permissions.generics as dry_permissions
import rest_framework.filters
from django.db import models
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
    from rest_framework.request import Request


@extend_schema(
    tags=["Profiles"],
)
@extend_schema_view(
    list=extend_schema(description="List available profiles.", summary="List profiles"),
    retrieve=extend_schema(description="Retrieve a single profile.", summary="Retrieve a profile"),
)
class ProfileModelViewSet(utils.views.BaseNoCreateDeleteModelViewSet[profiles.models.Profile]):
    serializer_class = serializers.ProfileSerializer
    filterset_class = profiles.filters.ProfileFilterSet
    filter_backends = (
        profiles.filters.ProfilePermissionFilterBackend,
        utils.filters.BaseFilterBackend,
        rest_framework.filters.OrderingFilter,
    )
    permission_classes = (dry_permissions.DRYObjectPermissions,)
    ordering_fields = ("created",)

    def get_queryset(self) -> "django_models.QuerySet[profiles.models.Profile]":
        queryset = profiles.models.Profile.objects.select_related("user", "space").prefetch_related(
            models.Prefetch(
                "cards",
                queryset=profiles.models.ProfileCard.objects.filter(
                    profiles.models.Profile.get_visible_cards_filter_expression(
                        user=self.request.user
                    )
                )
                .select_related(
                    "created_by",
                    "author_profile__user",
                    "author_profile__space",
                    "space_profile__space",
                )
                .distinct(),
            ),
            models.Prefetch(
                "members",
                queryset=profiles.models.Profile.objects.filter(
                    profiles.models.Profile.get_visible_members_filter_expression()
                ).select_related("user", "space"),
            ),
        )
        return queryset

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-images",
        parser_classes=(MultiPartParser,),
    )
    def upload_images(self, request: "Request", public_id: str | None = None) -> Response:
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
        return profiles.models.ProfileCard.objects.select_related(
            "created_by", "author_profile__user", "space_profile__space"
        ).prefetch_related(
            models.Prefetch(
                "profiles", queryset=profiles.models.Profile.objects.select_related("user", "space")
            )
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-images",
        parser_classes=(MultiPartParser,),
    )
    def upload_images(self, request: "Request", public_id: str | None = None) -> Response:
        profile_card = self.get_object()
        if "image" in request.FILES:
            profile_card.image_original = request.FILES["image"]
            profile_card.save()
        return Response({"status": "success"})
