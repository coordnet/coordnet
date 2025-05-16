import rest_framework.serializers


class PaperQAQuerySerializer(rest_framework.serializers.Serializer):
    question = rest_framework.serializers.CharField(required=True)
    bibliography = rest_framework.serializers.CharField(required=False)
    named_template = rest_framework.serializers.CharField(required=False)


class LocalPDFQuerySerializer(rest_framework.serializers.Serializer):
    question = rest_framework.serializers.CharField(required=True)
    model = rest_framework.serializers.CharField(required=False)
    embedding_model = rest_framework.serializers.CharField(required=False)


class MarkItDownSerializer(rest_framework.serializers.Serializer):
    file = rest_framework.serializers.FileField(required=True)
