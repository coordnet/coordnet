from django.contrib import admin

from uploads.models import UserUpload


@admin.register(UserUpload)
class UserUploadAdmin(admin.ModelAdmin):
    list_display = ("name", "content_type", "size", "created_at", "updated_at")
    search_fields = ("name", "content_type")
    list_filter = ("content_type", "created_at", "updated_at")
    readonly_fields = ("size", "created_at", "updated_at")
