import typing

from rest_framework import viewsets

if typing.TYPE_CHECKING:
    from django.db import models

T_co = typing.TypeVar("T_co", bound="models.Model", covariant=True)


class BaseModelViewSet(viewsets.ModelViewSet[T_co], typing.Generic[T_co]):
    lookup_field = "public_id"
    lookup_url_kwarg = "public_id"


class BaseReadOnlyModelViewSet(viewsets.ReadOnlyModelViewSet[T_co], typing.Generic[T_co]):
    lookup_field = "public_id"
    lookup_url_kwarg = "public_id"
