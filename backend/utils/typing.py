import typing

from django.db import models

T = typing.TypeVar("T", bound=models.Model)

if typing.TYPE_CHECKING:

    class GenericBase(typing.Generic[T]):
        pass

else:

    class GenericBase:
        def __class_getitem__(cls, _):
            return cls


class ModelBase(models.Model, GenericBase[T]):
    objects: "models.Manager[T]"

    class Meta:
        abstract = True
