import rest_framework.serializers


class PaperQAQuerySerializer(rest_framework.serializers.Serializer):
    question = rest_framework.serializers.CharField(required=True)
    bibliography = rest_framework.serializers.CharField(required=False)
    named_template = rest_framework.serializers.CharField(required=False)


class DeepResearchQuerySerializer(rest_framework.serializers.Serializer):
    question = rest_framework.serializers.CharField(required=True)
    reasoning_effort = rest_framework.serializers.ChoiceField(
        required=False, default="medium", choices=["low", "medium", "high"]
    )
    model = rest_framework.serializers.ChoiceField(
        required=False, default="o1", choices=["o1", "o3-mini"]
    )
