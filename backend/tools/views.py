import typing

import pqapi
import pqapi.models
from rest_framework.response import Response
from rest_framework.views import APIView

import tools.serializers

if typing.TYPE_CHECKING:
    import rest_framework.request


# Create a simple DRF view to query the PaperQA API and return the response.
class PaperQAView(APIView):
    def post(self, request: "rest_framework.request.Request") -> Response:

        serializer = tools.serializers.PaperQAQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        response = pqapi.agent_query(
            query=validated_data["question"],
            bibliography=validated_data.get("bibliography"),
            named_template=validated_data.get("named_template"),
        )

        return Response(response)
