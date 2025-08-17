import logging
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

logger = logging.getLogger(__name__)


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
                ).distinct(),
            ),
            models.Prefetch(
                "members",
                queryset=profiles.models.Profile.objects.filter(
                    profiles.models.Profile.get_visible_members_filter_expression()
                ),
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
                old_field_name = f"{key}_original"
                old_file = getattr(profile, old_field_name)
                
                # Check if old file exists and clean up if it doesn't
                if old_file and old_file.name:
                    try:
                        # Try to check if file exists in storage
                        if not old_file.storage.exists(old_file.name):
                            # File doesn't exist, clear the field reference
                            logger.warning(f"Orphaned file reference found for profile {profile.public_id}: {old_file.name}")
                            setattr(profile, old_field_name, None)
                            profile.save(update_fields=[old_field_name])
                    except Exception as e:
                        # Log the error but continue with upload
                        logger.warning(f"Error checking file existence for {old_file.name}: {e}")
                        # Clear the field reference to avoid conflicts
                        setattr(profile, old_field_name, None)
                        profile.save(update_fields=[old_field_name])
                
                # Now set the new file
                setattr(profile, old_field_name, request.FILES[key])
        
        try:
            profile.save()
            return Response({"status": "success"})
        except Exception as e:
            logger.error(f"Error saving profile images for profile {profile.public_id}: {e}")
            return Response(
                {"status": "error", "message": "Failed to upload images"}, 
                status=500
            )


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
            old_file = profile_card.image_original
            
            # Check if old file exists and clean up if it doesn't
            if old_file and old_file.name:
                try:
                    # Try to check if file exists in storage
                    if not old_file.storage.exists(old_file.name):
                        # File doesn't exist, clear the field reference
                        logger.warning(f"Orphaned file reference found for profile card {profile_card.public_id}: {old_file.name}")
                        profile_card.image_original = None
                        profile_card.save(update_fields=['image_original'])
                except Exception as e:
                    # Log the error but continue with upload
                    logger.warning(f"Error checking file existence for {old_file.name}: {e}")
                    # Clear the field reference to avoid conflicts
                    profile_card.image_original = None
                    profile_card.save(update_fields=['image_original'])
            
            # Now set the new file
            profile_card.image_original = request.FILES["image"]
        
        try:
            profile_card.save()
            return Response({"status": "success"})
        except Exception as e:
            logger.error(f"Error saving profile card image for card {profile_card.public_id}: {e}")
            return Response(
                {"status": "error", "message": "Failed to upload image"}, 
                status=500
            )
