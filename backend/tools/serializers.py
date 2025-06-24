import futurehouse_client
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
        fields = ("id", "name", "state", "created_at", "updated_at")
        read_only_fields = ("id", "state", "created_at", "updated_at")


class FutureHouseQuerySerializer(rest_framework.serializers.Serializer):
    question = rest_framework.serializers.CharField(required=True)
    agent_name = rest_framework.serializers.ChoiceField(
        required=True,
        help_text="Name of the agent/job to use",
        choices=[(member.value, member.name.title()) for member in futurehouse_client.JobNames],
    )
    task_id = rest_framework.serializers.UUIDField(
        required=False, allow_null=True, help_text="Optional task_id for the request"
    )

    def validate_agent_name(self, value):
        if value.lower() == "dummy":
            raise rest_framework.serializers.ValidationError(
                "Agent name 'dummy' is not allowed as it's for testing only."
            )
        return value


class MarkItDownSerializer(rest_framework.serializers.Serializer):
    file = rest_framework.serializers.FileField(required=True)
