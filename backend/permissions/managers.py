import typing

from django.contrib.auth.models import AnonymousUser
from django.db import models

from utils import managers as utils_managers

if typing.TYPE_CHECKING:
    from rest_framework import request

    from permissions import models as permissions_models
    from users import models as user_models


class MembershipModelQuerySetMixin(models.QuerySet):
    def user_has_permissions(
        self,
        action: "permissions_models.Action",
        user: "user_models.User | AnonymousUser | None" = None,
        request: "request.Request | None" = None,
    ) -> "models.QuerySet[permissions_models.MembershipModelMixin]":
        if user is None and request is None:
            raise ValueError("Either user or request must be provided.")

        if user is None and request is not None:
            user = request.user

        return self.filter(
            self.model.get_user_has_permissions_filter(action, user or AnonymousUser())
        )


class SoftDeletableMembershipModelQuerySet(
    utils_managers.SoftDeletableQuerySet, MembershipModelQuerySetMixin
):
    pass


class SoftDeletableMembershipModelManager(utils_managers.SoftDeletableManager):
    _queryset_class = SoftDeletableMembershipModelQuerySet


class MembershipModelQueryManager(models.Manager):
    _queryset_class = MembershipModelQuerySetMixin
