from django.db.models import QuerySet
from dry_rest_permissions.generics import DRYPermissionFiltersBase
from rest_framework import request, views

import tools.models
from permissions.models import READ


class PaperQACollectionPermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: request.Request, queryset: QuerySet, view: views.APIView
    ) -> "QuerySet[tools.models.PaperQACollection]":
        """Only return spaces that the user has access to."""
        return queryset.filter(
            tools.models.PaperQACollection.get_user_has_permission_filter(READ, user=request.user)
        ).distinct()
