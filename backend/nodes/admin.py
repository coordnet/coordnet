from django.contrib import admin

from nodes import models
from permissions.admin import ObjectMembershipInline


@admin.register(models.Space)
class SpaceAdmin(admin.ModelAdmin):
    """
    Admin interface for the Space model.
    Includes ObjectMembershipInline for managing memberships directly from the Space admin page.
    """

    inlines = [ObjectMembershipInline]
    autocomplete_fields = ("default_node", "document")
    search_fields = ["id", "public_id", "title"]
    list_display = ["title", "public_id"]


@admin.register(models.Document)
class DocumentAdmin(admin.ModelAdmin):
    """
    Admin interface for the Document model.
    """

    search_fields = ["id", "public_id", "document_type"]
    list_display = ["public_id", "document_type", "created_at", "updated_at"]


@admin.register(models.DocumentEvent)
class DocumentEventAdmin(admin.ModelAdmin):
    """
    Admin interface for the DocumentEvent model.
    """

    search_fields = ["id", "public_id", "document_type", "action"]
    list_display = ["public_id", "document_type", "action", "created_at"]


@admin.register(models.DocumentVersion)
class DocumentVersionAdmin(admin.ModelAdmin):
    """
    Admin interface for the DocumentVersion model.
    Uses autocomplete_fields to improve loading time for foreign key fields.
    """

    autocomplete_fields = ("document",)
    search_fields = ["id", "document__public_id", "document_type", "json_hash"]
    list_display = ["document", "document_type", "created_at"]


@admin.register(models.Node)
class NodeAdmin(admin.ModelAdmin):
    """
    Admin interface for the Node model.
    Uses autocomplete_fields to improve loading time for foreign key fields.
    """

    autocomplete_fields = ("space", "editor_document", "graph_document")
    search_fields = ["id", "public_id", "title", "description"]
    list_display = ["title", "public_id", "node_type"]


@admin.register(models.MethodNode)
class MethodNodeAdmin(admin.ModelAdmin):
    """
    Admin interface for the MethodNode model.
    Uses autocomplete_fields to improve loading time for foreign key fields.
    """

    autocomplete_fields = ("forked_from", "buddy", "space", "editor_document", "graph_document")
    search_fields = ["id", "public_id", "title", "description"]
    list_display = ["title", "public_id", "node_type"]


@admin.register(models.MethodNodeRun)
class MethodNodeRunAdmin(admin.ModelAdmin):
    """
    Admin interface for the MethodNodeRun model.
    Uses autocomplete_fields to improve loading time for foreign key fields.
    """

    autocomplete_fields = ("method", "method_version", "user", "space")
    search_fields = ["id", "public_id", "method__title", "user__name", "user__email"]
    list_display = ["method", "user", "created_at", "is_dev_run"]


@admin.register(models.MethodNodeVersion)
class MethodNodeVersionAdmin(admin.ModelAdmin):
    """
    Admin interface for the MethodNodeVersion model.
    Uses autocomplete_fields to improve loading time for foreign key fields.
    """

    autocomplete_fields = ("method", "buddy", "space")
    search_fields = ["id", "public_id", "title", "description", "method__title", "version"]
    list_display = ["method", "version", "title", "created_at"]
