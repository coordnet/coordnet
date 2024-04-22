import typing

from django.contrib.contenttypes import fields as content_type_fields
from django.contrib.contenttypes import models as content_type_models
from django.db import models

try:
    from django_stubs_ext.db.models import TypedModelMeta
except ImportError:
    # Django-Stubs is not installed in production, since it is only used for
    # type checking.
    TypedModelMeta = object  # type: ignore[misc,assignment]

if typing.TYPE_CHECKING:
    from django import http


class RoleOptions(models.TextChoices):
    OWNER = "owner", "Owner"
    MEMBER = "member", "Member"
    VIEWER = "viewer", "Viewer"


READ_ROLES = [RoleOptions.OWNER, RoleOptions.MEMBER, RoleOptions.VIEWER]
WRITE_ROLES = [RoleOptions.OWNER, RoleOptions.MEMBER]
ADMIN_ROLES = [RoleOptions.OWNER]


class ObjectMembershipRole(models.Model):
    """
    Model that represents the role of a user in an object membership.
    """

    role = models.CharField(max_length=10, choices=RoleOptions.choices, default=RoleOptions.MEMBER)


class ObjectMembership(models.Model):
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


class MembershipModelMixin(models.Model):
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

    def get_relevant_objects_for_permissions(self) -> list["MembershipModelMixin"]:
        return [self]

    @staticmethod
    def has_read_permission(request: "http.HttpRequest") -> bool:
        """
        Read permission on a global level.
        The actual permissions are handled on the object level.
        """
        return True

    def has_object_read_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        relevant_objects = self.get_relevant_objects_for_permissions()
        if any(obj.is_public for obj in relevant_objects):
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        return any(
            obj.members.filter(user=request.user, role__role__in=READ_ROLES).exists()
            for obj in relevant_objects
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
        """Return True if the user is the owner of the object."""
        relevant_objects = self.get_relevant_objects_for_permissions()
        if any(obj.is_public and obj.is_public_writable for obj in relevant_objects):
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        return any(
            obj.members.filter(user=request.user, role__role__in=WRITE_ROLES).exists()
            for obj in relevant_objects
        )
