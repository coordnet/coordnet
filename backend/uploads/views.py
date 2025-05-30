import dry_rest_permissions.generics as dry_permissions
from rest_framework.parsers import MultiPartParser

import permissions.utils
import permissions.views
import uploads.models
import uploads.serializers
import utils.views
from utils import filters as base_filters


class UserUploadViewSet(
    permissions.views.PermissionViewSetMixin[uploads.models.UserUpload],
    utils.views.BaseModelViewSet[uploads.models.UserUpload],
):
    """
    A viewset for managing user uploads.
    """

    lookup_field = "public_id"
    lookup_url_kwarg = "public_id"

    queryset = uploads.models.UserUpload.available_objects.all()
    serializer_class = uploads.serializers.UserUploadSerializer
    parser_classes = (MultiPartParser,)
    filterset_fields = ("name", "content_type")
    search_fields = ("name", "content_type")
    ordering_fields = ("name", "content_type", "size", "created_at", "updated_at")
    ordering = ("-created_at",)
    filter_backends = (base_filters.BaseFilterBackend,)
    permission_classes = (dry_permissions.DRYPermissions,)

    def perform_create(self, serializer):
        """
        Set the content_type and size fields based on the uploaded file.
        """
        file = serializer.validated_data.get("file")
        if file:
            content_type = file.content_type
            size = file.size
            filename = file.name
        else:
            content_type = ""
            size = 0
            filename = serializer.validated_data.get("name", "unknown_file")

        upload = serializer.save(content_type=content_type, size=size, name=filename)
        upload.members.create(user=self.request.user, role=permissions.utils.get_owner_role())
