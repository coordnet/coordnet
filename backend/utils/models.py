import typing
import uuid

from django.db import models
from dry_rest_permissions import generics as dry_permissions
from model_utils.models import SoftDeletableModel

try:
    from django_stubs_ext.db.models import TypedModelMeta
except ImportError:
    # Django-Stubs is not installed in production, since it is only used for
    # type checking.
    TypedModelMeta = object  # type: ignore[misc,assignment]

if typing.TYPE_CHECKING:
    from django import http


class BaseModel(SoftDeletableModel):
    """
    Base model for all models in the project.

    This model provides the following fields:
    - public_id: UUID field that is used as the primary key in the API.
    - created_at: DateTime field that is set to the current time when the object is created.
    - updated_at: DateTime field that is set to the current time when the object is updated.
    - is_removed: Boolean field that is used to soft-delete objects, this is provided by
                  `SoftDeletableModel`.

    TODO: pgtrigger also supports soft-deletion, either add it or replace model_utils.
    """

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(TypedModelMeta):
        abstract = True
        indexes = [models.Index(fields=["public_id"])]

    @staticmethod
    @dry_permissions.authenticated_users
    def has_read_permission(request: "http.HttpRequest") -> bool:
        """
        Since this is the base model, all users have read permission on a global level.
        Actual permissions are handled on the object level.
        """
        return True


class OwnedModelMixin(models.Model):
    """
    Mixin for models that are owned by a user.
    If a model is owned by a user, the user can only read and write their own objects.
    """

    owner = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="%(class)s")

    class Meta(TypedModelMeta):
        abstract = True

    @staticmethod
    @dry_permissions.authenticated_users
    def has_read_permission(request: "http.HttpRequest") -> bool:
        """
        Read permission on a global level.
        The actual permissions are handled on the object level.
        """
        return True

    @dry_permissions.authenticated_users
    def has_object_read_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        return self.owner == request.user

    @staticmethod
    @dry_permissions.authenticated_users
    def has_write_permission(request: "http.HttpRequest") -> bool:
        """
        Write permission on a global level.
        The actual ownership check is handled on the object level.
        However, this allows any authenticated user to create a new object.
        """
        return True

    @dry_permissions.authenticated_users
    def has_object_write_permission(self, request: "http.HttpRequest") -> bool:
        """Return True if the user is the owner of the object."""
        return self.owner == request.user
