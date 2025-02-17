import rest_framework.serializers


class PaperQAQuerySerializer(rest_framework.serializers.Serializer):
    question = rest_framework.serializers.CharField(required=True)
    bibliography = rest_framework.serializers.CharField(required=False)
    named_template = rest_framework.serializers.CharField(required=False)
