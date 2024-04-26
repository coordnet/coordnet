import typing

import dry_rest_permissions.generics as dry_permissions
from django import http
from rest_framework import decorators

from nodes import filters, models, serializers
from permissions import views as permission_views
from utils import filters as base_filters
from utils import views

if typing.TYPE_CHECKING:
    from rest_framework import request


class NodeModelViewSet(permission_views.PermissionViewSetMixin, views.BaseReadOnlyModelViewSet):
    """API endpoint that allows nodes to be viewed."""

    queryset = models.Node.available_objects.all()
    serializer_class = serializers.NodeSerializer
    filterset_fields = ("spaces",)
    filter_backends = (filters.NodePermissionFilterBackend, base_filters.BaseFilterBackend)
    permission_classes = (dry_permissions.DRYObjectPermissions,)


class SpaceModelViewSet(permission_views.PermissionViewSetMixin, views.BaseModelViewSet):
    """API endpoint that allows projects to be viewed or edited."""

    queryset = models.Space.available_objects.prefetch_related("nodes").all()
    serializer_class = serializers.SpaceSerializer
    filter_backends = (filters.SpacePermissionFilterBackend, base_filters.BaseFilterBackend)
    permission_classes = (dry_permissions.DRYObjectPermissions,)


class DocumentVersionModelViewSet(views.BaseReadOnlyModelViewSet):
    """API endpoint that allows document versions to be viewed."""

    queryset = models.DocumentVersion.available_objects.all()
    serializer_class = serializers.DocumentVersionSerializer
    filterset_class = filters.DocumentVersionFilterSet
    filter_backends = (
        filters.DocumentVersionPermissionFilterBackend,
        base_filters.BaseFilterBackend,
    )
    permission_classes = (dry_permissions.DRYObjectPermissions,)

    @decorators.action(detail=True, methods=["get"])
    def crdt(self, request: "request.Request", public_id: str | None = None) -> http.HttpResponse:
        document_version = self.get_object()
        return http.HttpResponse(document_version.data, content_type="application/octet-stream")
