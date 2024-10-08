from django.contrib.auth.models import AnonymousUser
from django.db.models import Q, QuerySet
from django_filters import rest_framework as filters
from dry_rest_permissions.generics import DRYPermissionFiltersBase
from rest_framework import request, views

import utils.filters as coord_filters
from nodes import models
from permissions.models import READ_ROLES


def get_document_queryset(request: request.Request) -> QuerySet:
    user = request.user or AnonymousUser()
    return models.Document.objects.filter(
        (
            Q(space__isnull=False)
            & (models.Space.get_user_has_permission_filter("read", user, prefix="space"))
        )
        | (
            Q(node_editor__isnull=False)
            & Q(models.Node.get_user_has_permission_filter("read", user, prefix="node_editor"))
        )
        | (
            Q(node_graph__isnull=False)
            & Q(models.Node.get_user_has_permission_filter("read", user, prefix="node_graph"))
        )
    )


class DocumentVersionFilterSet(filters.FilterSet):
    document = coord_filters.UUIDModelMultipleChoiceFilter(
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
        queryset_filters = (
            Q(is_public=True)
            | Q(spaces__is_public=True, spaces__is_removed=False)
            | Q(parents__is_public=True, parents__is_removed=False)
        )
        if request.user and request.user.is_authenticated:
            queryset_filters |= Q(
                members__user=request.user,
                members__role__role__in=READ_ROLES,
            )
            queryset_filters |= Q(
                spaces__members__user=request.user,
                spaces__members__role__role__in=READ_ROLES,
                spaces__is_removed=False,
            )
            queryset_filters |= Q(
                parents__members__user=request.user,
                parents__members__role__role__in=READ_ROLES,
                parents__is_removed=False,
            )
        return queryset.filter(queryset_filters).distinct()


class SpacePermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: request.Request, queryset: QuerySet, view: views.APIView
    ) -> "QuerySet[models.Space]":
        """Only return spaces that the user has access to."""
        queryset_filters = Q(is_public=True)
        if request.user and request.user.is_authenticated:
            queryset_filters |= Q(
                members__user=request.user,
                members__role__role__in=READ_ROLES,
            )
        return queryset.filter(queryset_filters).distinct()


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
