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
    autocomplete_fields = ("user", "role")


@admin.register(models.ObjectMembership)
class ObjectMembershipAdmin(admin.ModelAdmin):
    """
    Admin interface for the ObjectMembership model.
    """

    list_display = ["user", "role", "content_type", "object_id"]
    search_fields = [
        "id",
        "user__id",
        "user__public_id",
        "user__name",
        "user__email",
        "role__id",
        "role__role",
        "object_id",
    ]
    autocomplete_fields = ("user", "role")


@admin.register(models.ObjectMembershipRole)
class ObjectMembershipRoleAdmin(admin.ModelAdmin):
    """
    Admin interface for the ObjectMembershipRole model.
    """

    list_display = ["role"]
    search_fields = ["id", "role"]
