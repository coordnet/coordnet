import rest_framework.serializers

import tools.models
import utils.serializers


class PaperQAQuerySerializer(rest_framework.serializers.Serializer):
    question = rest_framework.serializers.CharField(required=True)
    bibliography = rest_framework.serializers.CharField(required=False)
    named_template = rest_framework.serializers.CharField(required=False)


class LocalPDFQuerySerializer(rest_framework.serializers.Serializer):
    question = rest_framework.serializers.CharField(required=True)
    model = rest_framework.serializers.CharField(required=False)
    embedding_model = rest_framework.serializers.CharField(required=False)

    class Meta:
        model = tools.models.PaperQACollection  # This is needed for dry rest permissions
        fields = ("question", "model", "embedding_model")


class PaperQACollectionSerializer(utils.serializers.BaseSerializer):
    class Meta:
        model = tools.models.PaperQACollection
        fields = ("id", "name", "created_at", "updated_at")


class MarkItDownSerializer(rest_framework.serializers.Serializer):
    file = rest_framework.serializers.FileField(required=True)
