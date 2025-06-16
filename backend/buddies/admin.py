from django.contrib import admin

from buddies import models


@admin.register(models.Buddy)
class BuddyAdmin(admin.ModelAdmin):
    """
    Admin interface for the Buddy model.
    """

    list_display = ["name", "model", "public_id"]
    search_fields = ["id", "public_id", "name", "description", "model"]
