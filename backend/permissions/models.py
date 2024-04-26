import typing

from django.contrib.contenttypes import fields as content_type_fields
from django.contrib.contenttypes import models as content_type_models
from django.db import models

import utils.models
import utils.typing
from permissions import managers

try:
    from django_stubs_ext.db.models import TypedModelMeta
except ImportError:
    # Django-Stubs is not installed in production, since it is only used for
    # type checking.
    TypedModelMeta = object  # type: ignore[misc,assignment]

if typing.TYPE_CHECKING:
    from django import http

    from users import typing as user_typing

READ = "read"
WRITE = "write"
MANAGE = "manage"
DELETE = "delete"

OWNER = "owner"
MEMBER = "member"
VIEWER = "viewer"

Action = typing.Literal["read", "write", "manage", "delete"]
Role = typing.Literal["owner", "member", "viewer"]


class RoleOptions(models.TextChoices):
    OWNER: tuple[Role, str] = "owner", "Owner"
    MEMBER: tuple[Role, str] = "member", "Member"
    VIEWER: tuple[Role, str] = "viewer", "Viewer"


READ_ROLES = [RoleOptions.OWNER, RoleOptions.MEMBER, RoleOptions.VIEWER]
WRITE_ROLES = [RoleOptions.OWNER, RoleOptions.MEMBER]
ADMIN_ROLES = [RoleOptions.OWNER]

ACTION_TO_ROLES: dict[Action, list[RoleOptions]] = {
    "read": READ_ROLES,
    "write": WRITE_ROLES,
    "manage": ADMIN_ROLES,
    "delete": ADMIN_ROLES,
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
    is_public = models.BooleanField("Whether the object is publicly available.", default=False)
    is_public_writable = models.BooleanField(
        "If the object is public, whether it is writable by unauthenticated users.", default=False
    )

    class Meta(TypedModelMeta):
        abstract = True

    @property
    def __permission_manager(self) -> models.Manager:
        return self.__class__.objects

    @staticmethod
    def get_user_has_permission_filter(action: Action, user: "user_typing.AnyUserType") -> models.Q:
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
        return (
            self.__permission_manager.filter(pk=self.pk)
            .filter(self.get_user_has_permission_filter("read", request.user))
            .exists()
        )

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
        return (
            self.__permission_manager.filter(pk=self.pk)
            .filter(self.get_user_has_permission_filter("write", request.user))
            .exists()
        )


class MembershipBaseModel(MembershipModelMixin, utils.models.BaseModel):
    """
    Base model for models that can have members.
    """

    objects: "managers.SoftDeletableMembershipModelManager[MembershipBaseModel]" = (
        managers.SoftDeletableMembershipModelManager(_emit_deprecation_warnings=True)
    )
    available_objects: "managers.SoftDeletableMembershipModelManager[MembershipBaseModel]" = (
        managers.SoftDeletableMembershipModelManager()
    )
    all_objects: "models.Manager[MembershipBaseModel]" = managers.MembershipModelQueryManager()

    @property
    def __permission_manager(self) -> models.Manager:
        return self.__class__.available_objects

    class Meta(TypedModelMeta):
        abstract = True
