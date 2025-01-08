import typing
import uuid
from copy import copy

import django.contrib
from django.db.models import Q
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from utils import models

if typing.TYPE_CHECKING:
    from typing import Any

    from django import http
    from django.db import models as django_models

    import users.models


T = typing.TypeVar("T", bound="models.BaseModel")


class PublicIdRelatedField(serializers.SlugRelatedField):
    """Override the default SlugRelatedField to use the public_id field as the lookup field."""

    def __init__(self, slug_field: str = "public_id", **kwargs: "Any"):
        super().__init__(slug_field=slug_field, **kwargs)


class BaseSerializer(serializers.ModelSerializer[T], typing.Generic[T]):
    """
    Base serializer for all serializers in the project.
    - It makes use of UUIDs as public primary keys to prevent the guessing of IDs.
    - It enforces 'create-only' fields, which can be set in a POST request, but not changed after.
    """

    id = serializers.ModelField(
        model_field=models.SoftDeletableBaseModel._meta.get_field("public_id"), read_only=True
    )

    serializer_related_field = PublicIdRelatedField

    def to_internal_value(self, data: "http.QueryDict") -> "http.QueryDict":
        """Enforces 'create-only' fields."""
        data = copy(data)

        # Enforce create_only_fields.
        if self.instance:
            if create_only_fields := getattr(self.Meta, "create_only_fields", []):
                for field in set(create_only_fields).intersection(set(data.keys())):
                    data.pop(field)

        return super().to_internal_value(data)

    class Meta:
        # Since we are using UUIDs as primary keys with the key `id`, we don't need to show the
        # `public_id` field.
        exclude: list[str] | None = ["public_id"]


class BaseSoftDeletableSerializer(BaseSerializer[T], typing.Generic[T]):
    """
    Base serializer for all soft-deletable serializers in the project.
    - It enforces 'create-only' fields, which can be set in a POST request, but not changed after.
    """

    class Meta(BaseSerializer.Meta):
        exclude: list[str] | None = (BaseSerializer.Meta.exclude or []) + ["is_removed"]


@extend_schema_field(uuid.UUID)
class AvailableUserField(PublicIdRelatedField):
    def get_queryset(self) -> "django_models.QuerySet[users.models.User]":
        user = self.context["request"].user
        filter_expression = Q(profile__draft=False)
        if user.is_authenticated:
            filter_expression |= Q(pk=user.pk)
        return django.contrib.auth.get_user_model().objects.filter(filter_expression)
