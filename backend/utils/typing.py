from django.db import models


class ModelBase(models.Model):
    objects: "models.Manager[ModelBase]"

    class Meta:
        abstract = True
