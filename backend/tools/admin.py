from django.contrib import admin

from tools import models


@admin.register(models.PaperQACollection)
class PaperQACollectionAdmin(admin.ModelAdmin):
    """
    Admin interface for the PaperQACollection model.
    """

    list_display = ["name", "state", "public_id"]
    search_fields = ["id", "public_id", "name"]
    autocomplete_fields = ["uploads"]
