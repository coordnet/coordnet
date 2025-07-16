import typing

from django.contrib.auth.models import AnonymousUser
from django.db.models import Q, QuerySet
from django_filters import rest_framework as filters
from dry_rest_permissions.generics import DRYPermissionFiltersBase
from rest_framework import request, views

import utils.filters
from nodes import models
from permissions.models import READ
from utils.parsers import is_truthy

if typing.TYPE_CHECKING:
    import users.models


def get_document_queryset(request: request.Request) -> QuerySet:
    user = request.user or AnonymousUser()
    return models.Document.objects.filter(
        (
            Q(space__isnull=False)
            & (models.Space.get_user_has_permission_filter(READ, user, prefix="space"))
        )
        | (
            Q(node_editor__isnull=False)
            & Q(models.Node.get_user_has_permission_filter(READ, user, prefix="node_editor"))
        )
        | (
            Q(node_graph__isnull=False)
            & Q(models.Node.get_user_has_permission_filter(READ, user, prefix="node_graph"))
        )
    )


def get_space_queryset(request: request.Request) -> QuerySet:
    user = request.user or AnonymousUser()
    return models.Space.available_objects.filter(
        models.Space.get_user_has_permission_filter(action=READ, user=user)
    ).distinct()


def get_method_queryset(request: request.Request) -> QuerySet:
    user = request.user or AnonymousUser()
    return models.MethodNode.available_objects.filter(
        models.MethodNode.get_user_has_permission_filter(action=READ, user=user)
    ).distinct()


class DocumentVersionFilterSet(filters.FilterSet):
    document = utils.filters.UUIDModelMultipleChoiceFilter(
        queryset=get_document_queryset, field_name="document__public_id"
    )
    document_type = filters.ChoiceFilter(lookup_expr="iexact", choices=models.DocumentType.choices)

    class Meta:
        model = models.DocumentVersion
        fields = ["document", "document_type"]


class NodePermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: request.Request, queryset: QuerySet, view: views.APIView
    ) -> "QuerySet[models.Node]":
        """Only return nodes that the user has access to."""
        return queryset.filter(
            models.Node.get_user_has_permission_filter(READ, user=request.user)
        ).distinct()


class NodeFilterSet(filters.FilterSet):
    space = utils.filters.UUIDModelChoiceFilter(queryset=get_space_queryset)

    class Meta:
        model = models.Node
        fields = ["space"]


class SpacePermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: request.Request, queryset: QuerySet, view: views.APIView
    ) -> "QuerySet[models.Space]":
        """Only return spaces that the user has access to."""
        return queryset.filter(
            models.Space.get_user_has_permission_filter(READ, user=request.user)
        ).distinct()


class DocumentVersionPermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: request.Request, queryset: QuerySet, view: views.APIView
    ) -> "QuerySet[models.DocumentVersion]":
        """Only return spaces that the user has access to."""
        user = request.user or AnonymousUser()
        queryset_filters = (
            (
                Q(document__space__isnull=False)
                & (
                    models.Space.get_user_has_permission_filter(
                        "read", user, prefix="document__space"
                    )
                )
            )
            | (
                Q(document__node_editor__isnull=False)
                & Q(
                    models.Node.get_user_has_permission_filter(
                        "read", user, prefix="document__node_editor"
                    )
                )
            )
            | (
                Q(document__node_graph__isnull=False)
                & Q(
                    models.Node.get_user_has_permission_filter(
                        "read", user, prefix="document__node_graph"
                    )
                )
            )
        )

        return queryset.filter(queryset_filters).distinct()


class MethodNodePermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: request.Request, queryset: QuerySet, view: views.APIView
    ) -> "QuerySet[models.MethodNode]":
        """Only return nodes that the user has access to."""
        return queryset.filter(
            models.MethodNode.get_user_has_permission_filter(action="read", user=request.user)
        ).distinct()


class MethodNodeFilterSet(filters.FilterSet):
    public = filters.BooleanFilter()
    shared = filters.BooleanFilter()
    creator = filters.BooleanFilter(field_name="creator")
    author = filters.BooleanFilter(field_name="authors")

    class Meta:
        model = models.MethodNode
        fields = ["public", "shared", "creator", "author"]

    def filter_creator(
        self, queryset: QuerySet[models.MethodNode], name: str, value: "users.models.User"
    ) -> QuerySet[models.MethodNode]:
        user = self.request.user
        if not user.is_authenticated:
            return queryset.none()
        if value:
            return queryset.filter(creator=user)
        else:
            return queryset.exclude(creator=user)

    def filter_public(
        self, queryset: QuerySet[models.MethodNode], name: str, value: bool
    ) -> QuerySet[models.MethodNode]:
        if value:
            return queryset.filter(is_public=True)
        else:
            return queryset.exclude(is_public=False)

    def filter_shared(
        self, queryset: QuerySet[models.MethodNode], name: str, value: "users.models.User"
    ) -> QuerySet[models.MethodNode]:
        user = self.request.user
        if not user.is_authenticated:
            return queryset.none()

        # TODO: Check if this makes sense in the UI.
        if value:
            return queryset.exclude(creator=user)
        else:
            return queryset

    def filter_author(
        self, queryset: QuerySet[models.MethodNode], name: str, value: "users.models.User"
    ) -> QuerySet[models.MethodNode]:
        user = self.request.user
        if not user.is_authenticated:
            return queryset.none()
        if value:
            return queryset.filter(authors=user)
        else:
            return queryset.exclude(authors=user)


class MethodNodeRunPermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: request.Request, queryset: QuerySet, view: views.APIView
    ) -> "QuerySet[models.MethodNodeRun]":
        """Return runs that the user has access to."""
        if not request.user or not request.user.is_authenticated:
            return queryset.none()

        # Default behavior: return all runs the user has access to
        return queryset.filter(
            models.MethodNodeRun.get_user_has_permission_filter(action="read", user=request.user)
        ).distinct()


class MethodNodeRunFilterSet(filters.FilterSet):
    space = utils.filters.UUIDModelChoiceFilter(queryset=get_space_queryset)
    method = utils.filters.UUIDModelChoiceFilter(queryset=get_method_queryset)
    own_runs = filters.BooleanFilter(method="filter_own_runs")
    is_public = filters.BooleanFilter(method="filter_is_public")

    class Meta:
        model = models.MethodNodeRun
        fields = ["space", "method", "own_runs", "is_public"]

    def filter_own_runs(
        self, queryset: QuerySet[models.MethodNodeRun], name: str, value: bool
    ) -> QuerySet[models.MethodNodeRun]:
        """Filter to show only the current user's runs when requested."""
        user = self.request.user
        if not user.is_authenticated:
            return queryset.none()

        if is_truthy(value):
            # Explicitly filter for user's own runs
            return queryset.filter(user=user)
        else:
            # When own_runs=false, return runs where the user isn't the owner
            return queryset.exclude(user=user)

    def filter_is_public(
        self, queryset: QuerySet[models.MethodNodeRun], name: str, value: bool
    ) -> QuerySet[models.MethodNodeRun]:
        """Filter to show only public or non-public runs."""
        if is_truthy(value):
            return queryset.filter(is_public=True)
        else:
            return queryset.filter(is_public=False)


class MethodNodeVersionPermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: request.Request, queryset: QuerySet, view: views.APIView
    ) -> "QuerySet[models.MethodNodeVersion]":
        """Only return nodes that the user has access to."""
        return queryset.filter(
            models.MethodNode.get_user_has_permission_filter(
                action="read", user=request.user, prefix="method"
            )
        ).distinct()


class MethodNodeVersionFilterSet(filters.FilterSet):
    method = utils.filters.UUIDModelChoiceFilter(queryset=get_method_queryset)

    class Meta:
        model = models.MethodNodeVersion
        fields = ["method"]
