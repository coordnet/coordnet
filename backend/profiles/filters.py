import typing

import django.contrib.auth
from django.db.models import Q
from dry_rest_permissions.generics import DRYPermissionFiltersBase

import nodes.models
import profiles.models
import utils.filters
from permissions.models import MANAGE

if typing.TYPE_CHECKING:
    from django.db.models import QuerySet
    from rest_framework import request, views


class ProfilePermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: "request.Request", queryset: "QuerySet", view: "views.APIView"
    ) -> "QuerySet[not profiles.models.Profile]":
        """Only return profiles that the user has access to."""
        queryset_filters = Q(draft=False) & (Q(space__is_removed=False) | Q(space__isnull=True))
        if request.user and request.user.is_authenticated:
            queryset_filters |= nodes.models.Space.get_user_has_permission_filter(
                action=MANAGE, user=request.user, prefix="space"
            ) | Q(user=request.user)

        return queryset.filter(queryset_filters).distinct()


class ProfileCardPermissionFilterBackend(DRYPermissionFiltersBase):
    def filter_list_queryset(
        self, request: "request.Request", queryset: "QuerySet", view: "views.APIView"
    ) -> "QuerySet[profiles.models.ProfileCard]":
        """Only return profile cards that the user has access to."""
        queryset_filters = Q(draft=False)
        if request.user and request.user.is_authenticated:
            queryset_filters |= Q(created_by=request.user) | Q(author=request.user)
        return queryset.filter(queryset_filters).distinct()


def get_profile_queryset(request: "request.Request") -> "QuerySet[profiles.models.Profile]":
    """Return the queryset of profiles that the user has access to."""
    queryset_filters = Q(draft=False) & (Q(space__is_removed=False) | Q(space__isnull=True))
    if request.user and request.user.is_authenticated:
        queryset_filters |= nodes.models.Space.get_user_has_permission_filter(
            action=MANAGE, user=request.user, prefix="space"
        ) | Q(user=request.user)
    return profiles.models.Profile.objects.filter(queryset_filters).distinct()


class ProfileCardFilterSet(utils.filters.BaseFilterSet):
    profiles = utils.filters.UUIDModelChoiceFilter(queryset=get_profile_queryset)

    class Meta:
        model = profiles.models.ProfileCard
        fields = ["profiles"]


def get_space_queryset(request: "request.Request") -> "QuerySet[nodes.models.Space]":
    """Return the queryset of spaces that the user has access to."""
    queryset_filters = Q(profile__draft=False)
    if request.user and request.user.is_authenticated:
        queryset_filters |= nodes.models.Space.get_user_has_permission_filter(
            action=MANAGE, user=request.user
        )
    return nodes.models.Space.available_objects.filter(queryset_filters).distinct()


def get_user_queryset(request: "request.Request") -> "QuerySet[django.contrib.objects.User]":
    """Return the queryset of users that the user has access to."""
    queryset_filters = Q(profile__draft=False)
    if request.user and request.user.is_authenticated:
        queryset_filters |= Q(pk=request.user.pk)
    return django.contrib.auth.get_user_model().objects.filter(queryset_filters).distinct()


class ProfileFilterSet(utils.filters.BaseFilterSet):
    space = utils.filters.UUIDModelChoiceFilter(queryset=get_space_queryset)
    user = utils.filters.UUIDModelChoiceFilter(queryset=get_user_queryset)

    class Meta:
        model = profiles.models.Profile
        fields = ["space", "user"]
