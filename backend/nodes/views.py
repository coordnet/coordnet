import json
import typing
import uuid

import django.contrib.postgres.search as pg_search
import dry_rest_permissions.generics as dry_permissions
import rest_framework.filters
import sentry_sdk
from django import http
from django.db import models as django_models
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import decorators, generics, parsers, response

import permissions.managers
import permissions.models
import permissions.utils
import permissions.views
import users.models
import utils.llm
import utils.managers
import utils.pagination
import utils.parsers
from nodes import filters, models, serializers
from utils import filters as base_filters
from utils import views

if typing.TYPE_CHECKING:
    from rest_framework import request


@extend_schema(tags=["Nodes"])
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

    @extend_schema(
        description="Upload one or more images for a node.",
        summary="Upload images",
    )
    @decorators.action(
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


@extend_schema(tags=["Skills"])
@extend_schema_view(
    create=extend_schema(description="Create a new skill.", summary="Create skill"),
    list=extend_schema(
        description="List available skills.",
        summary="List skills",
    ),
    retrieve=extend_schema(description="Retrieve a single skill.", summary="Retrieve a skill"),
    update=extend_schema(description="Update a skill.", summary="Update skill"),
    partial_update=extend_schema(
        description="Partially update a skill.", summary="Partial update skill"
    ),
    destroy=extend_schema(description="Delete a skill.", summary="Delete skill"),
)
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
        queryset = (
            self.queryset.annotate_user_permissions(  # type: ignore[attr-defined]
                request=self.request
            )
            .defer("content", "text", "graph_document", "editor_document", "search_vector")
            .select_related("space__profile", "creator__profile")
            .prefetch_related(
                django_models.Prefetch(
                    "authors", queryset=users.models.User.objects.select_related("profile")
                ),
            )
            .annotate(
                run_count=django_models.Count("runs", distinct=True),
            )
        )
        assert isinstance(queryset, permissions.managers.SoftDeletableMembershipModelQuerySet)

        if self.action == "retrieve":
            latest_version_subquery = (
                models.MethodNodeVersion.objects.filter(method=django_models.OuterRef("pk"))
                .order_by("-version")
                .values("public_id", "version")[:1]
            )

            return queryset.annotate(
                latest_version__id=django_models.Subquery(
                    latest_version_subquery.values("public_id")
                ),
                latest_version__version=django_models.Subquery(
                    latest_version_subquery.values("version")
                ),
            )

        return queryset

    def get_serializer_class(self) -> type[serializers.MethodNodeListSerializer]:
        if self.action == "retrieve":
            return serializers.MethodNodeDetailSerializer
        return self.serializer_class

    @extend_schema(
        description="Upload one or more images for a skill.",
        summary="Upload images",
    )
    @decorators.action(
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


@extend_schema(tags=["Spaces"])
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

    queryset = models.Space.available_objects.all()
    serializer_class = serializers.SpaceSerializer
    filter_backends = (filters.SpacePermissionFilterBackend, base_filters.BaseFilterBackend)
    permission_classes = (dry_permissions.DRYPermissions,)

    def get_queryset(
        self,
    ) -> "permissions.managers.SoftDeletableMembershipModelQuerySet[models.Space]":
        queryset = models.Space.available_objects.annotate(
            node_count=django_models.Count("nodes", filter=~django_models.Q(nodes__is_removed=True))
        ).select_related("default_node")
        assert isinstance(queryset, permissions.managers.SoftDeletableMembershipModelQuerySet)
        return queryset.annotate_user_permissions(request=self.request)

    def perform_create(self, serializer: serializers.SpaceSerializer) -> None:  # type: ignore[override]
        space = serializer.save()
        space.members.create(user=self.request.user, role=permissions.utils.get_owner_role())


@extend_schema(tags=["Nodes"])
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


@extend_schema(tags=["Nodes"])
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


@extend_schema(tags=["Skills"])
@extend_schema_view(
    create=extend_schema(description="Create a new skill run.", summary="Create skill run"),
    list=extend_schema(
        description="List available skill runs.",
        summary="List skill runs",
    ),
    retrieve=extend_schema(
        description="Retrieve a single skill run.",
        summary="Retrieve a skill run",
    ),
    update=extend_schema(description="Update a skill run.", summary="Update skill run"),
    partial_update=extend_schema(
        description="Partially update a skill run.", summary="Partial update skill run"
    ),
    destroy=extend_schema(description="Delete a skill run.", summary="Delete skill run"),
)
class MethodNodeRunModelViewSet(views.BaseModelViewSet[models.MethodNodeRun]):
    """API endpoint that allows method node runs to be viewed or edited."""

    allowed_methods = ["GET", "POST", "DELETE", "HEAD", "OPTIONS"]
    queryset = models.MethodNodeRun.available_objects.select_related(
        "method_version",
        "method",
        "space",
    ).defer("method_version__method_data", "method__content")
    serializer_class = serializers.MethodNodeRunListSerializer
    filterset_class = filters.MethodNodeRunFilterSet
    filter_backends = (filters.MethodNodeRunPermissionFilterBackend, base_filters.BaseFilterBackend)
    permission_classes = (dry_permissions.DRYObjectPermissions,)

    def get_queryset(self) -> "django_models.QuerySet[models.MethodNodeRun]":
        if self.action in ("list", "decide"):
            return self.queryset.defer("method_data")
        return self.queryset

    def get_serializer_class(self) -> type[serializers.MethodNodeRunListSerializer]:
        if self.action == "retrieve":
            return serializers.MethodNodeRunDetailSerializer
        return self.serializer_class

    @decorators.action(detail=True, methods=["post"])
    def execute(
        self, request: "request.Request", public_id: str | None = None
    ) -> response.Response:
        run = self.get_object()
        serializer = serializers.MethodNodeRunExecutionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        run.method.execute(method_run_id=run.id, **serializer.validated_data)
        return response.Response(status=204)

    @decorators.action(detail=False, methods=["post"])
    def decide(self, request: "request.Request", public_id: str | None = None) -> response.Response:
        def create_json_schema_for_method(method: models.MethodNode) -> dict | None:
            function_description = ""
            if method.title:
                function_description += method.title
            if method.description and method.title:
                function_description += f": {method.description}"
            elif method.description:
                function_description = method.description
            else:
                return None

            return {
                "type": "function",
                "function": {
                    "name": str(method.pk),
                    "description": function_description,
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "method_argument": {
                                "type": "string",
                                "description": "The input for this method.",
                            },
                            "include_attachment": {
                                "type": "boolean",
                                "description": "Whether to include the attachment.",
                            },
                        },
                    },
                },
            }

        def parse_messages(discord_dict: dict) -> tuple[list[dict], list[str]]:
            attachment_limit = 1
            saved_attachments: list[str] = []
            parsed_messages = []
            for message in discord_dict["messages"]:
                parsed_message = {
                    "content": message.get("content", {}).get("text", ""),
                    "role": "assistant" if message.get("content", {}).get("user") else "user",
                }
                if chat_attachments := message.get("content", {}).get("attachments", []):
                    for idx, full_attachment in enumerate(chat_attachments):
                        if (text := full_attachment.get("text")) and len(
                            saved_attachments
                        ) < attachment_limit:
                            parsed_message["content"] += f"\nAttachment {idx}:\n{text}"
                            saved_attachments.append(text)
                parsed_messages.append(parsed_message)

            # Invert the list to get the oldest messages first.
            return parsed_messages[::-1], saved_attachments

        client = utils.llm.get_openai_client()
        parsed_messages, attachments = parse_messages(request.data)

        completion_response = client.chat.completions.create(
            model="gpt-4o",
            tools=filter(
                None,
                [
                    create_json_schema_for_method(method)  # type: ignore[misc]
                    for method in models.MethodNode.available_objects.filter(
                        models.MethodNode.get_user_has_permission_filter(
                            action="read", user=request.user
                        )
                    ).distinct()
                ],
            ),
            messages=[  # type: ignore[arg-type]
                {
                    "role": "developer",
                    "content": "Considering the chat provided, which method would you recommend for"
                    " the user? If there is no fitting method, don't return anything."
                    "\nWhen passing parameters to the method, set the 'include_attachment' flag"
                    " if it's relevant to the current method call.",
                }
            ]
            + parsed_messages,
        )
        try:
            method_pk = int(completion_response.choices[0].message.tool_calls[0].function.name)  # type: ignore[index]
            arguments = json.loads(
                completion_response.choices[0].message.tool_calls[0].function.arguments  # type: ignore[index]
            )
            method_argument = arguments["method_argument"]
            if arguments.get("include_attachment"):
                for attachment in attachments:
                    method_argument += "\n"
                    method_argument += attachment

        except (IndexError, AttributeError, KeyError) as exc:
            sentry_sdk.capture_exception(exc)
            return response.Response("Error parsing messages.", status=400)

        # TODO: Check that the method was actually part of the original queryset.
        method = models.MethodNode.objects.get(pk=method_pk)
        run = models.MethodNodeRun.objects.create(  # type: ignore[misc]
            method=method,
            space=method.space,
            user=request.user,
            method_data={},
            # TODO: This picks the latest version, even if the user doesn't have access to it.
            method_version=method.versions.latest("version"),
        )

        run.method.execute(
            method_run_id=run.id,
            method_argument=method_argument,
            buddy_id=request.data.get("buddy_id"),
        )
        return response.Response(
            serializers.MethodNodeRunDetailSerializer(run, context={"request": request}).data
        )


@extend_schema(tags=["Skills"])
@extend_schema_view(
    create=extend_schema(description="Create a new skill version.", summary="Create skill version"),
    list=extend_schema(
        description="List available skill versions.",
        summary="List skill versions",
    ),
    retrieve=extend_schema(
        description="Retrieve a single skill version.",
        summary="Retrieve a skill version",
    ),
    update=extend_schema(description="Update a skill version.", summary="Update skill version"),
    partial_update=extend_schema(
        description="Partially update a skill version.", summary="Partial update skill version"
    ),
    destroy=extend_schema(description="Delete a skill version.", summary="Delete skill version"),
)
class MethodNodeVersionModelViewSet(views.BaseModelViewSet[models.MethodNodeVersion]):
    """API endpoint that allows method node versions to be viewed or edited."""

    queryset = (
        models.MethodNodeVersion.available_objects.select_related("method", "creator")
        .prefetch_related("authors")
        .annotate(
            run_count=django_models.Count("runs", distinct=True),
        )
    )

    serializer_class = serializers.MethodNodeVersionListSerializer
    filterset_class = filters.MethodNodeVersionFilterSet
    filter_backends = (
        filters.MethodNodeVersionPermissionFilterBackend,
        base_filters.BaseFilterBackend,
    )
    permission_classes = (dry_permissions.DRYObjectPermissions,)

    def get_queryset(self) -> "django_models.QuerySet[models.MethodNodeVersion]":
        if self.action == "list":
            return self.queryset.defer("method_data")
        return self.queryset

    def get_serializer_class(self) -> type[serializers.MethodNodeVersionListSerializer]:
        if self.action == "retrieve":
            return serializers.MethodNodeVersionDetailSerializer
        return self.serializer_class
