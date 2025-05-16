import typing

import dry_rest_permissions.generics
from django.contrib.auth.models import AnonymousUser
from django.db import models
from django.db.models import Q

import permissions.models
import utils.models

if typing.TYPE_CHECKING:
    from django import http

    from users import typing as user_typing


class PaperQACollection(permissions.models.MembershipBaseModel):
    """
    A collection of documents for PaperQA.
    """

    name = models.SlugField(max_length=255, unique=True)
    files = models.BinaryField(null=True, blank=True)
    index = models.BinaryField(null=True, blank=True)

    class Meta(
        permissions.models.MembershipModelMixin.Meta, utils.models.SoftDeletableBaseModel.Meta
    ):
        pass

    @staticmethod
    @dry_rest_permissions.generics.authenticated_users
    def has_write_permission(request: "http.HttpRequest") -> bool:
        """
        Write permission on a global level.
        The actual ownership check is handled on the object level.
        """
        return True

    @staticmethod
    @dry_rest_permissions.generics.authenticated_users
    def has_read_permission(request: "http.HttpRequest") -> bool:
        """
        Read permission on a global level.
        The actual ownership check is handled on the object level.
        """
        return True

    def has_object_write_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        """Return True if the user has write permissions for this object."""
        return super().has_object_write_permission(request)

    def has_object_read_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        return super().has_object_read_permission(request)

    @staticmethod
    def get_user_has_permission_filter(
        action: permissions.models.Action,
        user: "user_typing.AnyUserType | None" = None,
        prefix: str | None = None,
    ) -> Q:
        """
        Return a Q object that filters whether the user has permission to do <action> on this
        object.
        Note: We're not filtering out whether the object itself is deleted, this should be done
              before calling this method, but we're checking whether memberships are deleted.
              Roles are not soft-deletable, so those aren't checked either.
        """
        user = user or AnonymousUser()

        def permissions_for_role(roles: list[permissions.models.RoleOptions]) -> Q:
            return Q(members__user=user, members__role__role__in=roles)

        if action == permissions.models.READ:
            queryset_filters = Q(is_public=True)
            if user.is_authenticated:
                queryset_filters |= permissions_for_role(permissions.models.READ_ROLES)
            return queryset_filters
        if action in (permissions.models.WRITE, permissions.models.DELETE):
            queryset_filters = Q(is_public=True, is_public_writable=True)
            if user.is_authenticated:
                queryset_filters |= permissions_for_role(permissions.models.WRITE_ROLES)
            return queryset_filters
        if action == permissions.models.MANAGE:
            if user.is_authenticated:
                return permissions_for_role(permissions.models.ADMIN_ROLES)
            return Q(pk=None)  # That is a false statement, so it will return False.

        raise ValueError("Invalid action type.")
