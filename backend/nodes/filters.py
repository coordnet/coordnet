from django.db.models import Q, QuerySet
from django_filters import rest_framework as filters
from dry_rest_permissions.generics import DRYPermissionFiltersBase
from rest_framework import request, views

import utils.filters as coord_filters
from nodes import models
from permissions.models import READ_ROLES


class DocumentVersionFilterSet(filters.FilterSet):
    # TODO: Look at this when/if setting up permissions for browsable API
    document = coord_filters.UUIDModelMultipleChoiceFilter(
        queryset=models.Document.objects.all(), field_name="document__public_id"
    )
    document_type = filters.CharFilter(lookup_expr="iexact")

    class Meta:
        model = models.DocumentVersion
        fields = ["document", "document_type"]


class NodePermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: request.Request, queryset: QuerySet, view: views.APIView
    ) -> "QuerySet[models.Node]":
        """Only return nodes that the user has access to."""
        queryset_filters = (
            Q(is_public=True) | Q(spaces__is_public=True) | Q(parents__is_public=True)
        )
        if request.user and request.user.is_authenticated:
            queryset_filters |= Q(members__user=request.user, members__role__role__in=READ_ROLES)
            queryset_filters |= Q(
                spaces__members__user=request.user, spaces__members__role__role__in=READ_ROLES
            )
            queryset_filters |= Q(
                parents__members__user=request.user, parents__members__role__role__in=READ_ROLES
            )
        return queryset.filter(queryset_filters).distinct()


class SpacePermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: request.Request, queryset: QuerySet, view: views.APIView
    ) -> "QuerySet[models.Space]":
        """Only return spaces that the user has access to."""
        queryset_filters = Q(is_public=True)
        if request.user and request.user.is_authenticated:
            queryset_filters |= Q(members__user=request.user, members__role__role__in=READ_ROLES)
        return queryset.filter(queryset_filters).distinct()
