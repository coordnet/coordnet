import typing

import dry_rest_permissions.generics
from django.contrib.contenttypes import fields as content_type_fields
from django.contrib.contenttypes import models as content_type_models
from django.db import models

import utils.models
import utils.typing
from permissions import managers

T = typing.TypeVar("T", bound="MembershipModelMixin")

try:
    from django_stubs_ext.db.models import TypedModelMeta
except ImportError:
    # Django-Stubs is not installed in production, since it is only used for
    # type checking.
    TypedModelMeta = object  # type: ignore[misc,assignment]

if typing.TYPE_CHECKING:
    from django import http

    import users.typing


READ: typing.Final = "read"
WRITE: typing.Final = "write"
MANAGE: typing.Final = "manage"
DELETE: typing.Final = "delete"

OWNER: typing.Final = "owner"
MEMBER: typing.Final = "member"
VIEWER: typing.Final = "viewer"
WRITER: typing.Final = "writer"

Action = typing.Literal["read", "write", "manage", "delete"]
Role = typing.Literal["owner", "member", "viewer", "writer"]


class RoleOptions(models.TextChoices):
    OWNER = OWNER, "Owner"
    MEMBER = MEMBER, "Member"
    VIEWER = VIEWER, "Viewer"
    WRITER = WRITER, "Writer"


READ_ROLES = [RoleOptions.OWNER, RoleOptions.MEMBER, RoleOptions.VIEWER, RoleOptions.WRITER]
WRITE_ROLES = [RoleOptions.OWNER, RoleOptions.MEMBER, RoleOptions.WRITER]
ADMIN_ROLES = [RoleOptions.OWNER]

ACTION_TO_ROLES: dict[Action, list[RoleOptions]] = {
    "read": READ_ROLES,
    "write": WRITE_ROLES,
    "manage": ADMIN_ROLES,
    "delete": WRITE_ROLES,  # Writers can delete, but not manage
}


class ObjectMembershipRole(models.Model):
    """
    Model that represents the role of a user in an object membership.
    """

    role = models.CharField(
        max_length=10, choices=RoleOptions.choices, default=RoleOptions.MEMBER, unique=True
    )

    def __str__(self) -> str:
        return self.role.capitalize()


class ObjectMembership(utils.models.BaseModel):
    """
    Model that represents the membership of a user in an object.
    """

    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="memberships")
    role = models.ForeignKey(ObjectMembershipRole, on_delete=models.CASCADE, related_name="+")

    # A generic foreign key to the object that the user is a member of.
    content_type = models.ForeignKey(content_type_models.ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = content_type_fields.GenericForeignKey("content_type", "object_id")

    class Meta(TypedModelMeta):
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["user", "content_type", "object_id"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "content_type", "object_id"], name="unique_membership"
            )
        ]

    @dry_rest_permissions.generics.authenticated_users
    @staticmethod
    def has_read_permission(request: "http.HttpRequest") -> bool:
        """Return True in general and handle on detail level."""
        return True

    @dry_rest_permissions.generics.authenticated_users
    @staticmethod
    def has_write_permission(request: "http.HttpRequest") -> bool:
        """Return True in general and handle on detail level."""
        return True

    def has_object_read_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        if not self.content_object:
            return False

        relevant_objects = self.content_object.get_relevant_objects_for_permissions()
        return any(
            obj.members.filter(user=request.user, role__role__in=READ_ROLES).exists()
            for obj in relevant_objects
        )

    def __has_object_permission_management_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        if not self.content_object:
            return False

        relevant_objects = self.content_object.get_relevant_objects_for_permissions()
        return any(
            obj.members.filter(user=request.user, role__role__in=ADMIN_ROLES).exists()
            for obj in relevant_objects
        )

    def has_object_manage_permissions_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        return self.__has_object_permission_management_permission(request)

    def has_object_delete_permission_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        return self.__has_object_permission_management_permission(request)


class MembershipModelMixin(utils.typing.ModelBase):
    """
    Mixin for models that can have members.
    """

    members = content_type_fields.GenericRelation(ObjectMembership)
    is_public = models.BooleanField("Public read access", default=False)
    is_public_writable = models.BooleanField(
        "Public write access, if public read access is enabled", default=False
    )

    objects = managers.MembershipModelQueryManager()

    class Meta(TypedModelMeta):
        abstract = True

    @property
    def __permission_manager(self) -> models.Manager:
        return self.__class__.objects

    @property
    def user_roles(self) -> list[RoleOptions]:
        return self.__user_roles_cache

    @user_roles.setter
    def user_roles(self, value: list[RoleOptions]) -> None:
        self.__user_roles_cache = value
        self.__fill_user_permissions_cache()

    @staticmethod
    def __get_user(
        *, request: "http.HttpRequest | None" = None, user: "users.typing.AnyUserType | None" = None
    ) -> "users.typing.AnyUserType":
        if user:
            return user
        if request:
            return request.user
        raise ValueError("Either request or user must be provided.")

    def __fill_user_permissions_cache(self) -> None:
        if (user_roles := getattr(self, "user_roles", None)) is not None:
            for action, roles in ACTION_TO_ROLES.items():
                self.__user_permissions_cache[action] = any(role in user_roles for role in roles)

    def get_allowed_actions_for_user(
        self, *, user: "users.typing.AnyUserType", use_cache: bool = True
    ) -> list[Action]:
        """Return the roles that the user has for this object."""
        # If the user can see the object, they can read it.
        allowed_actions: list[Action] = ["read"]

        if self.get_allowed_action_for_user(user=user, action=WRITE, use_cache=use_cache):
            allowed_actions.extend(["write", "delete"])
        if self.get_allowed_action_for_user(user=user, action=MANAGE, use_cache=use_cache):
            allowed_actions.append("manage")
        return allowed_actions

    def get_allowed_action_for_user(
        self, *, user: "users.typing.AnyUserType", action: Action, use_cache: bool = True
    ) -> bool:
        """Return whether the user is allowed to do that action."""
        permission_query = self.__permission_manager.filter(pk=self.pk).filter(
            self.get_user_has_permission_filter(action, user)
        )
        if not use_cache:
            return permission_query.exists()
        if self.__user_permissions_cache[action] is None:
            self.__user_permissions_cache[action] = permission_query.exists()
            if action == WRITE:
                self.__user_permissions_cache[DELETE] = self.__user_permissions_cache[action]
        return self.__user_permissions_cache[action] or False  # To please mypy

    @staticmethod
    def get_user_has_permission_filter(
        action: Action, user: "users.typing.AnyUserType | None"
    ) -> models.Q:
        raise NotImplementedError

    @staticmethod
    def get_role_annotation_query(
        user: "users.typing.AnyUserType",
    ) -> models.Func | models.Expression | models.QuerySet:
        raise NotImplementedError

    @staticmethod
    def has_read_permission(request: "http.HttpRequest") -> bool:
        """
        Read permission on a global level.
        The actual permissions are handled on the object level.
        """
        return True

    def has_object_read_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user has read permissions for this object."""
        return self.get_allowed_action_for_user(user=request.user, action=READ)

    @staticmethod
    def has_write_permission(request: "http.HttpRequest") -> bool:
        """
        Write permission on a global level.
        The actual ownership check is handled on the object level.
        However, this allows any authenticated user to create a new object.
        """
        return True

    def has_object_write_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user has write permissions for this object."""
        return self.get_allowed_action_for_user(user=request.user, action=WRITE)

    def has_object_manage_permission(
        self,
        request: "http.HttpRequest | None" = None,
        user: "users.typing.AnyUserType | None" = None,
    ) -> bool:
        """Return True if the user has manage permissions for this object."""
        return self.get_allowed_action_for_user(
            user=self.__get_user(request=request, user=user), action=MANAGE
        )

    @staticmethod
    @dry_rest_permissions.generics.authenticated_users
    def has_create_permission(request: "http.HttpRequest") -> bool:
        """Return True because any authenticated user can create a new object."""
        return True

    def __init__(self, *args: typing.Any, **kwargs: typing.Any) -> None:
        super().__init__(*args, **kwargs)
        self.__user_permissions_cache: dict[Action, bool | None] = {
            "read": None,
            "write": None,
            "manage": None,
            "delete": None,
        }
        self.__user_roles_cache = []


class MembershipBaseModel(MembershipModelMixin, utils.models.SoftDeletableBaseModel):
    """
    Base model for models that can have members.
    """

    objects = managers.SoftDeletableMembershipModelUnfilteredManager()  # type: ignore[assignment,misc]
    available_objects = managers.SoftDeletableMembershipModelManager()  # type: ignore[misc]
    all_objects = managers.MembershipModelQueryManager()  # type: ignore[misc]

    def __init__(self, *args: typing.Any, **kwargs: typing.Any) -> None:
        super().__init__(*args, **kwargs)

    @property
    def __permission_manager(self) -> models.Manager:
        return self.__class__.available_objects

    class Meta(TypedModelMeta):
        abstract = True
