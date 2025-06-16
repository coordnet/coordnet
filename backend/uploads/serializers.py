import uploads.models
import utils.serializers


class UserUploadSerializer(utils.serializers.BaseSerializer):
    class Meta:
        model = uploads.models.UserUpload
        fields = ("id", "name", "file", "content_type", "size", "created_at", "updated_at")
        read_only_fields = ("id", "content_type", "size", "created_at", "updated_at")
