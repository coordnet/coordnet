from django.contrib import admin

from llms import models


@admin.register(models.LLModel)
class LLModelAdmin(admin.ModelAdmin):
    """
    Admin interface for the LLModel model.
    """

    list_display = ["name", "identifier", "is_available", "disabled"]
    search_fields = ["id", "public_id", "name", "identifier", "description"]
    autocomplete_fields = ["replacement"]
