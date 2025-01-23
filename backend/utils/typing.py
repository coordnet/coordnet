from django.contrib.auth.models import AnonymousUser
from django.db import models

from users.models import User as UserType


class ModelBase(models.Model):
    objects: "models.Manager[ModelBase]"

    class Meta:
        abstract = True


HttpRequestUser = UserType | AnonymousUser
