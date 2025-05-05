import io
import typing
import zipfile
from pathlib import Path

import adrf.viewsets
import dry_rest_permissions.generics as dry_permissions
import pqapi
import pqapi.models
import sentry_sdk
from asgiref.sync import sync_to_async
from markitdown import MarkItDown
from paperqa import Settings, agent_query
from paperqa.agents import get_directory_index
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

import permissions.utils
import tools.filters
import tools.models
import tools.serializers
from utils import filters as base_filters

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


class PaperQACollectionViewSet(adrf.viewsets.ModelViewSet):
    """
    A viewset for managing PaperQA collections.
    """

    lookup_field = "public_id"
    lookup_url_kwarg = "public_id"

    queryset = tools.models.PaperQACollection.available_objects.all()
    serializer_class = tools.serializers.PaperQACollectionSerializer
    filterset_fields = ("name",)
    search_fields = ("name",)
    ordering_fields = ("name", "created_at", "updated_at")
    ordering = ("name",)
    filter_backends = (
        tools.filters.PaperQACollectionPermissionFilterBackend,
        base_filters.BaseFilterBackend,
    )
    permission_classes = (dry_permissions.DRYPermissions,)

    def perform_create(self, serializer: tools.serializers.PaperQACollectionSerializer) -> None:
        space = serializer.save()
        space.members.create(user=self.request.user, role=permissions.utils.get_owner_role())

    @action(  # type: ignore[type-var]
        detail=True, methods=["post"], serializer_class=tools.serializers.LocalPDFQuerySerializer
    )
    async def query(self, request: "rest_framework.request.Request", public_id: str) -> Response:
        """
        Query the PaperQA collection.
        """
        collection = await sync_to_async(self.get_object)()

        pdf_dir = (
            Path(__file__).parent
            / "paperqa"
            # / str(request.user.public_id)  # Useful, but more complicated to upload files manually
            / "pdfs"
            / collection.name
        )
        index_dir = (
            Path(__file__).parent
            / "paperqa"
            # / str(request.user.public_id)  # Useful, but more complicated to upload files manually
            / "indices"
            / collection.name
        )

        # Load index and files from the collection (and unzip them)
        if collection.files:
            # Unzip the files and load them into the directory
            with zipfile.ZipFile(io.BytesIO(collection.files)) as zf:
                zf.extractall(pdf_dir)

        if collection.index:
            # Unzip the index and load it into the directory
            with zipfile.ZipFile(io.BytesIO(collection.index)) as zf:
                zf.extractall(index_dir)

        self.paperqa_settings = Settings(
            temperature=0.5,
            paper_directory=str(pdf_dir),
            index_directory=str(index_dir),
        )

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

            # Re-zip the files and index
            pdf_buffer = io.BytesIO()
            with zipfile.ZipFile(pdf_buffer, "w") as zf:
                for pdf_file in pdf_dir.glob("*.pdf"):
                    zf.write(pdf_file, pdf_file.name)
            pdf_buffer.seek(0)
            collection.files = pdf_buffer.getvalue()

            index_buffer = io.BytesIO()
            with zipfile.ZipFile(index_buffer, "w") as zf:
                for index_file in index_dir.glob("*"):
                    zf.write(index_file, index_file.name)
            index_buffer.seek(0)
            collection.index = index_buffer.getvalue()

            await collection.asave()
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
