import typing

import factory
from factory.django import DjangoModelFactory

import permissions.models
from permissions import utils

if typing.TYPE_CHECKING:
    from users import models as user_models


class ObjectMembershipFactory(DjangoModelFactory[permissions.models.ObjectMembership]):
    """Factory for creating Permissions of a user on an object."""

    class Meta:
        model = "permissions.ObjectMembership"


T = typing.TypeVar("T")


class BaseMembershipModelMixinFactory(DjangoModelFactory[T], typing.Generic[T]):
    """Factory for creating BaseMembershipModelMixin objects."""

    is_public = False
    is_public_writable = False

    @factory.post_generation
    def owner(self, create: bool, extracted: "user_models.User", **kwargs: typing.Any) -> None:
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A user was passed in, use it
            self.members.create(user=extracted, role=utils.get_owner_role())

    @factory.post_generation
    def member(self, create: bool, extracted: "user_models.User", **kwargs: typing.Any) -> None:
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A user was passed in, use it
            self.members.create(user=extracted, role=utils.get_member_role())

    @factory.post_generation
    def viewer(self, create: bool, extracted: "user_models.User", **kwargs: typing.Any) -> None:
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A user was passed in, use it
            self.members.create(user=extracted, role=utils.get_viewer_role())
