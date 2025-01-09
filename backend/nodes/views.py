import typing
import uuid

import django.contrib.postgres.search as pg_search
import dry_rest_permissions.generics as dry_permissions
import rest_framework.filters
from django import http
from django.db import models as django_models
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import decorators, generics, parsers, response
from rest_framework.decorators import action

import permissions.managers
import permissions.models
import permissions.utils
import permissions.views
import utils.managers
import utils.pagination
import utils.parsers
from nodes import filters, models, serializers
from utils import filters as base_filters
from utils import views

if typing.TYPE_CHECKING:
    from rest_framework import request


@extend_schema(
    tags=["Nodes"],
)
@extend_schema_view(
    list=extend_schema(
        description="List available nodes.",
        summary="List nodes",
        parameters=[
            OpenApiParameter(
                name="spaces",
                type=uuid.UUID,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Public ID of the space to filter by.",
                many=True,
            )
        ],
    ),
    retrieve=extend_schema(description="Retrieve a single node.", summary="Retrieve a node"),
)
class NodeModelViewSet(views.BaseReadOnlyModelViewSet[models.Node]):
    """API endpoint that allows nodes to be viewed."""

    serializer_class = serializers.NodeListSerializer
    filterset_class = filters.NodeFilterSet
    filter_backends = (filters.NodePermissionFilterBackend, base_filters.BaseFilterBackend)
    permission_classes = (dry_permissions.DRYObjectPermissions,)

    def get_queryset(
        self,
    ) -> "utils.managers.SoftDeletableQuerySet[models.Node]":
        queryset = (
            models.Node.available_objects.filter(node_type=models.NodeType.DEFAULT)
            .only(
                "id",
                "public_id",
                "title_token_count",
                "text_token_count",
                "space",
                "image_original",
            )
            .select_related("space")
        )

        if self.action == "retrieve":
            queryset = queryset.prefetch_related(
                django_models.Prefetch(
                    "subnodes",
                    to_attr="available_subnodes",
                    queryset=queryset.annotate(
                        has_subnodes=django_models.Exists(
                            models.Node.available_objects.filter(
                                parents=django_models.OuterRef("pk"),
                            )
                        )
                    ),
                )
            )

        assert isinstance(queryset, utils.managers.SoftDeletableQuerySet)
        return queryset

    def get_serializer_class(self) -> type[serializers.NodeListSerializer]:
        if self.action == "retrieve":
            return serializers.NodeDetailSerializer
        return self.serializer_class

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-images",
        parser_classes=(parsers.MultiPartParser,),
    )
    def upload_images(
        self, request: "request.Request", public_id: str | None = None
    ) -> response.Response:
        node = self.get_object()
        if "image" in request.FILES:
            node.image_original = request.FILES["image"]
            node.save()
        return response.Response({"status": "success"})


class MethodNodeModelViewSet(
    views.BaseModelViewSet[models.MethodNode],
    permissions.views.PermissionViewSetMixin[models.MethodNode],
):
    """API endpoint that allows methods to be viewed or edited."""

    queryset = models.MethodNode.available_objects.all()
    serializer_class = serializers.MethodNodeListSerializer
    filter_backends = (filters.MethodNodePermissionFilterBackend, base_filters.BaseFilterBackend)
    permission_classes = (dry_permissions.DRYPermissions,)
    allowed_methods = ["GET", "POST", "PUT", "PATCH", "DELETE"]

    def get_queryset(
        self,
    ) -> "permissions.managers.SoftDeletableMembershipModelQuerySet[models.MethodNode]":
        queryset = self.queryset.annotate_user_permissions(  # type: ignore[attr-defined]
            request=self.request
        ).defer("content", "text", "graph_document", "editor_document", "search_vector")
        assert isinstance(queryset, permissions.managers.SoftDeletableMembershipModelQuerySet)
        return queryset

    def get_serializer_class(self) -> type[serializers.MethodNodeListSerializer]:
        if self.action == "retrieve":
            return serializers.MethodNodeDetailSerializer
        return self.serializer_class

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-images",
        parser_classes=(parsers.MultiPartParser,),
    )
    def upload_images(
        self, request: "request.Request", public_id: str | None = None
    ) -> response.Response:
        node = self.get_object()
        if "image" in request.FILES:
            node.image_original = request.FILES["image"]
            node.save()
        return response.Response({"status": "success"})


@extend_schema(
    tags=["Spaces"],
)
@extend_schema_view(
    create=extend_schema(description="Create a new space.", summary="Create space"),
    list=extend_schema(description="List available spaces.", summary="List spaces"),
    retrieve=extend_schema(description="Retrieve a single space.", summary="Retrieve space"),
    update=extend_schema(description="Update a space.", summary="Update space"),
    partial_update=extend_schema(
        description="Partially update a space.", summary="Partial update space"
    ),
    destroy=extend_schema(description="Delete a space.", summary="Delete space"),
)
class SpaceModelViewSet(
    permissions.views.PermissionViewSetMixin[models.Space], views.BaseModelViewSet[models.Space]
):
    """API endpoint that allows projects to be viewed or edited."""

    queryset = models.Space.available_objects.prefetch_related("nodes").all()
    serializer_class = serializers.SpaceSerializer
    filter_backends = (filters.SpacePermissionFilterBackend, base_filters.BaseFilterBackend)
    permission_classes = (dry_permissions.DRYPermissions,)

    def get_queryset(
        self,
    ) -> "permissions.managers.SoftDeletableMembershipModelQuerySet[models.Space]":
        queryset = models.Space.available_objects.annotate(
            node_count=django_models.Count("nodes", filter=~django_models.Q(nodes__is_removed=True))
        )
        assert isinstance(queryset, permissions.managers.SoftDeletableMembershipModelQuerySet)
        return queryset.annotate_user_permissions(request=self.request)

    def perform_create(self, serializer: serializers.SpaceSerializer) -> None:  # type: ignore[override]
        space = serializer.save()
        space.members.create(user=self.request.user, role=permissions.utils.get_owner_role())


@extend_schema(
    tags=["Nodes"],
)
@extend_schema_view(
    list=extend_schema(description="List available node versions.", summary="List node versions"),
    retrieve=extend_schema(
        description="Retrieve a single node version.", summary="Retrieve a node version"
    ),
)
class DocumentVersionModelViewSet(views.BaseReadOnlyModelViewSet[models.DocumentVersion]):
    """API endpoint that allows document versions to be viewed."""

    queryset = models.DocumentVersion.available_objects.all()
    serializer_class = serializers.DocumentVersionSerializer
    filterset_class = filters.DocumentVersionFilterSet
    filter_backends = (
        filters.DocumentVersionPermissionFilterBackend,
        base_filters.BaseFilterBackend,
        rest_framework.filters.OrderingFilter,
    )
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]
    permission_classes = (dry_permissions.DRYObjectPermissions,)

    @extend_schema(
        description="Retrieve the CRDT file of a node version.",
        summary="Retrieve CRDT of a node version",
    )
    @decorators.action(detail=True, methods=["get"])
    def crdt(self, request: "request.Request", public_id: str | None = None) -> http.HttpResponse:
        document_version = self.get_object()
        return http.HttpResponse(document_version.data, content_type="application/octet-stream")


@extend_schema(
    tags=["Nodes"],
)
class SearchView(generics.ListAPIView):
    """API endpoint that allows searching for nodes."""

    pagination_class = utils.pagination.NoCountLimitOffsetPagination
    queryset = models.Node.available_objects.none()

    @extend_schema(
        description="Search nodes.",
        summary="Search nodes",
        parameters=[serializers.NodeSearchQuerySerializer],
        responses={200: serializers.NodeSearchResultSerializer},
    )
    def get(
        self, request: "request.Request", *args: typing.Any, **kwargs: typing.Any
    ) -> response.Response:
        search_query_serializer = serializers.NodeSearchQuerySerializer(
            data=request.query_params, context={"request": request}
        )
        search_query_serializer.is_valid(raise_exception=True)

        nodes = (
            models.Node.available_objects.filter(
                django_models.Q(
                    models.Node.get_user_has_permission_filter(
                        permissions.models.READ, request.user
                    ),
                    node_type=models.NodeType.DEFAULT,
                )
                | django_models.Q(
                    models.MethodNode.get_user_has_permission_filter(
                        permissions.models.READ, request.user, prefix="methodnode"
                    ),
                ),
            )
            .select_related("space")
            .prefetch_related(
                django_models.Prefetch(
                    "parents", queryset=models.Node.available_objects.only("id", "public_id")
                ),
            )
            .annotate(
                rank=pg_search.SearchRank(
                    "search_vector",
                    pg_search.SearchQuery(search_query_serializer.validated_data["q"]),
                )
            )
            .filter(
                search_vector=pg_search.SearchQuery(search_query_serializer.validated_data["q"])
            )
            .order_by("-rank")
            .distinct()
        )

        if "space" in search_query_serializer.validated_data:
            nodes = nodes.filter(space=search_query_serializer.validated_data["space"])

        if "node_type" in search_query_serializer.validated_data:
            nodes = nodes.filter(node_type=search_query_serializer.validated_data["node_type"])

        page = self.paginate_queryset(nodes)
        if page is not None:
            serializer = serializers.NodeSearchResultSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)

        serializer = serializers.NodeSearchResultSerializer(
            nodes, many=True, context={"request": request}
        )
        return response.Response(serializer.data)


class MethodNodeRunModelViewSet(views.BaseModelViewSet[models.MethodNodeRun]):
    """API endpoint that allows method node runs to be viewed or edited."""

    allowed_methods = ["GET", "POST", "DELETE", "HEAD", "OPTIONS"]
    queryset = models.MethodNodeRun.available_objects.select_related(
        "method_version",
        "method",
        "space",
    )
    serializer_class = serializers.MethodNodeRunListSerializer
    filterset_class = filters.MethodNodeRunFilterSet
    filter_backends = (filters.MethodNodeRunPermissionFilterBackend, base_filters.BaseFilterBackend)
    permission_classes = (dry_permissions.DRYObjectPermissions,)

    def get_queryset(self) -> "django_models.QuerySet[models.MethodNodeRun]":
        if self.action == "retrieve":
            return self.queryset.defer("method_data")
        return self.queryset

    def get_serializer_class(self) -> type[serializers.MethodNodeRunListSerializer]:
        if self.action == "retrieve":
            return serializers.MethodNodeRunDetailSerializer
        return self.serializer_class


class MethodNodeVersionModelViewSet(views.BaseModelViewSet[models.MethodNodeVersion]):
    """API endpoint that allows method node versions to be viewed or edited."""

    queryset = models.MethodNodeVersion.available_objects.select_related("method")
    serializer_class = serializers.MethodNodeVersionListSerializer
    filterset_class = filters.MethodNodeVersionFilterSet
    filter_backends = (
        filters.MethodNodeVersionPermissionFilterBackend,
        base_filters.BaseFilterBackend,
    )
    permission_classes = (dry_permissions.DRYObjectPermissions,)

    def get_queryset(self) -> "django_models.QuerySet[models.MethodNodeVersion]":
        if self.action == "retrieve":
            return self.queryset.defer("method_data")
        return self.queryset

    def get_serializer_class(self) -> type[serializers.MethodNodeVersionListSerializer]:
        if self.action == "retrieve":
            return serializers.MethodNodeVersionDetailSerializer
        return self.serializer_class
