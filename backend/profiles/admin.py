from django.contrib import admin

from profiles import models


@admin.register(models.Profile)
class ProfileAdmin(admin.ModelAdmin):
    """
    Admin interface for the Profile model.
    """

    list_display = ["title", "profile_slug", "public_id", "draft"]
    search_fields = [
        "id",
        "public_id",
        "title",
        "profile_slug",
        "description",
        "user__name",
        "user__email",
        "space__title",
    ]
    autocomplete_fields = ["user", "space", "cards"]


@admin.register(models.ProfileCard)
class ProfileCardAdmin(admin.ModelAdmin):
    """
    Admin interface for the ProfileCard model.
    """

    list_display = ["title", "public_id", "draft"]
    search_fields = ["id", "public_id", "title", "description", "status_message"]
    autocomplete_fields = ["created_by", "author_profile", "space_profile"]
