import typing
from pathlib import Path

import pqapi
import pqapi.models
import sentry_sdk
from adrf.views import APIView as AsyncAPIView
from markitdown import MarkItDown
from paperqa import Settings, agent_query
from paperqa.agents import get_directory_index
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

import tools.serializers

if typing.TYPE_CHECKING:
    import rest_framework.request


class PaperQAError(APIException):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = "An error occurred while processing your request"


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


class LocalPDFQueryView(AsyncAPIView):
    def __init__(self, *args: typing.Any, **kwargs: typing.Any):
        super().__init__(*args, **kwargs)
        self.pdf_dir = Path(__file__).parent / "paperqa" / "pdfs"

        # Create settings with LLM configuration
        self.paperqa_settings = Settings(
            temperature=0.5,
            paper_directory=str(self.pdf_dir),  # Specify the directory containing PDFs
        )

    async def post(self, request: "rest_framework.request.Request") -> Response:
        try:
            serializer = tools.serializers.LocalPDFQuerySerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            if validated_data.get("model"):
                self.paperqa_settings.llm = validated_data["model"]
                self.paperqa_settings.summary_llm = validated_data["model"]
            if validated_data.get("embedding_model"):
                self.paperqa_settings.embedding = validated_data["embedding_model"]

            # Generate the directory index for the PDFs
            await get_directory_index(settings=self.paperqa_settings)

            # Query the PDFs using the ask function directly
            response = await agent_query(
                query=validated_data["question"],
                settings=self.paperqa_settings,
                agent_type=self.paperqa_settings.agent.agent_type,
            )
            # Check if we got a valid response
            if not response:
                return Response(
                    {"error": "No answer could be generated from the available documents."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            return Response(response)

        except Exception as e:
            raise PaperQAError(detail=str(e)) from e


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
