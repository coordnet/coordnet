from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from permissions import models


class ObjectMembershipInline(GenericTabularInline):
    """
    Inline admin interface for ObjectMembership.
    Allows managing ObjectMembership instances within the parent model's admin page.
    """

    model = models.ObjectMembership
    extra = 1


admin.site.register(models.ObjectMembership)
admin.site.register(models.ObjectMembershipRole)
