import typing

from django.contrib.auth.models import AnonymousUser
from django.db import models

from utils import managers as utils_managers

if typing.TYPE_CHECKING:
    from rest_framework import request

    import permissions.models
    import users.typing


T_co = typing.TypeVar("T_co", bound="permissions.models.MembershipModelMixin", covariant=True)


class MembershipModelQuerySetMixin(models.QuerySet[T_co], typing.Generic[T_co]):
    def annotate_user_permissions(
        self,
        user: "users.typing.AnyUserType | None" = None,
        request: "request.Request | None" = None,
    ) -> "typing.Self":
        if user is None and request is None:
            raise ValueError("Either user or request must be provided.")

        if user is None and request is not None:
            user = request.user

        role_subquery = self.model.get_role_annotation_query(user or AnonymousUser())
        return self.annotate(user_roles=role_subquery).distinct()


class SoftDeletableMembershipModelQuerySet(  # type: ignore[override]
    utils_managers.SoftDeletableQuerySet[T_co],
    MembershipModelQuerySetMixin[T_co],
    typing.Generic[T_co],
):
    def annotate_user_permissions(
        self,
        user: "users.typing.AnyUserType | None" = None,
        request: "request.Request | None" = None,
    ) -> "typing.Self":
        return MembershipModelQuerySetMixin.annotate_user_permissions(
            self, user=user, request=request
        )


class SoftDeletableMembershipModelManager(
    utils_managers.SoftDeletableManager[T_co], typing.Generic[T_co]
):
    _queryset_class = SoftDeletableMembershipModelQuerySet

    def get_queryset(self) -> SoftDeletableMembershipModelQuerySet[T_co]:
        return typing.cast(SoftDeletableMembershipModelQuerySet[T_co], super().get_queryset())

    def annotate_user_permissions(
        self,
        user: "users.typing.AnyUserType | None" = None,
        request: "request.Request | None" = None,
    ) -> "SoftDeletableMembershipModelQuerySet[T_co]":
        return self.get_queryset().annotate_user_permissions(user=user, request=request)


class SoftDeletableMembershipModelUnfilteredQuerySet(  # type: ignore[override]
    utils_managers.SoftDeletableQuerySet[T_co],
    MembershipModelQuerySetMixin[T_co],
    typing.Generic[T_co],
):
    pass


class SoftDeletableMembershipModelUnfilteredManager(
    utils_managers.SoftDeletableUnfilteredManager[T_co], typing.Generic[T_co]
):
    _queryset_class: type[SoftDeletableMembershipModelUnfilteredQuerySet[T_co]] = (
        SoftDeletableMembershipModelUnfilteredQuerySet
    )

    def get_queryset(self) -> SoftDeletableMembershipModelUnfilteredQuerySet[T_co]:
        return self._queryset_class(
            model=self.model, using=self._db, hints=getattr(self, "_hints", None)
        )

    def annotate_user_permissions(
        self,
        user: "users.typing.AnyUserType | None" = None,
        request: "request.Request | None" = None,
    ) -> "SoftDeletableMembershipModelUnfilteredQuerySet[T_co]":
        return self.get_queryset().annotate_user_permissions(user=user, request=request)


class MembershipModelQueryManager(models.Manager[T_co], typing.Generic[T_co]):
    _queryset_class = MembershipModelQuerySetMixin

    def get_queryset(self) -> MembershipModelQuerySetMixin[T_co]:
        return self._queryset_class(
            model=self.model, using=self._db, hints=getattr(self, "_hints", None)
        )

    def annotate_user_permissions(
        self,
        user: "users.typing.AnyUserType | None" = None,
        request: "request.Request | None" = None,
    ) -> "MembershipModelQuerySetMixin[T_co]":
        return self.get_queryset().annotate_user_permissions(user=user, request=request)
