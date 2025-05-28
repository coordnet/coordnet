import typing

import pqapi
import pqapi.models
import sentry_sdk
from markitdown import MarkItDown
from rest_framework.parsers import MultiPartParser
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


# Create a DRF view to convert files using the MarkItDown library.
class MarkItDownView(APIView):
    parser_classes = (MultiPartParser,)

    def post(self, request: "rest_framework.request.Request") -> Response:
        serializer = tools.serializers.MarkItDownSerializer(data=request.FILES)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        file_obj = validated_data["file"]

        md = MarkItDown()

        try:
            result = md.convert(file_obj.file)

            # Return the converted content
            return Response(
                {
                    "status": "success",
                    "filename": file_obj.name,
                    "text_content": result.text_content,
                }
            )
        except Exception as exc:
            # Return error information if conversion fails
            sentry_sdk.capture_exception(exc)
            return Response(
                {
                    "status": "error",
                    "filename": file_obj.name,
                    "error": str(exc),
                },
                status=400,
            )
        finally:
            if hasattr(file_obj, "close"):
                file_obj.close()
