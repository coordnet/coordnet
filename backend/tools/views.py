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
from django.conf import settings
from django.shortcuts import get_object_or_404
from markitdown import MarkItDown
from paperqa import Settings, agent_query
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
import tools.tasks
import uploads.models
import uploads.serializers
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

    @action(detail=True, methods=["get"])
    def files(self, request, public_id=None):
        """
        List all files in the collection.
        """
        collection = self.get_object()
        uploaded_files = collection.uploads.all()
        serializer = uploads.serializers.UserUploadSerializer(uploaded_files, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def add_upload(self, request, public_id=None):
        """
        Add an existing UserUpload to the collection.

        Parameters:
        - upload_id: ID of the upload to add
        - skip_index_update: If true, don't update the index after adding the upload
        """
        collection = self.get_object()

        # Check if the user has write permission
        if not collection.has_object_write_permission(request):
            return Response(
                {"detail": "You do not have permission to add files to this collection."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get the upload ID from the request
        upload_id = request.data.get("upload_id")
        if not upload_id:
            return Response(
                {"detail": "No upload_id was provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the upload
        try:
            upload = uploads.models.UserUpload.objects.get(public_id=upload_id)
        except uploads.models.UserUpload.DoesNotExist:
            return Response(
                {"detail": "The specified upload does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if the user has read permission for the upload
        if not upload.has_object_read_permission(request):
            return Response(
                {"detail": "You do not have permission to access this upload."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if the upload is already in the collection
        if upload in collection.uploads.all():
            return Response(
                {"detail": "The specified upload is already in this collection."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if we should skip the index update
        skip_index_update = request.data.get("skip_index_update", False)

        if not skip_index_update:
            # Set the collection state to waiting
            collection.state = tools.models.PaperQACollection.States.WAITING
            collection.save(update_fields=["state"])

        # Add the upload to the collection
        collection.uploads.add(upload)

        # Trigger the index update task if not skipped
        if not skip_index_update:
            tools.tasks.update_collection_index.delay(collection.id)

        return Response(
            uploads.serializers.UserUploadSerializer(upload).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def update_index(self, request, public_id=None):
        """
        Manually trigger an update of the collection index.
        """
        collection = self.get_object()

        # Check if the user has write permission
        if not collection.has_object_write_permission(request):
            return Response(
                {"detail": "You do not have permission to update this collection's index."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if the collection is already being processed
        if collection.state == tools.models.PaperQACollection.States.PROCESSING:
            return Response(
                {"detail": "The collection is already being processed. Please try again later."},
                status=status.HTTP_409_CONFLICT,
            )

        # Set the collection state to waiting
        collection.state = tools.models.PaperQACollection.States.WAITING
        collection.save(update_fields=["state"])

        # Trigger the index update task
        tools.tasks.update_collection_index.delay(collection.id)

        return Response(
            {"detail": "Index update has been triggered."},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["delete"], url_path="files/(?P<upload_id>[^/.]+)")
    def remove_upload(self, request, public_id=None, upload_id=None):
        """
        Remove a file from the collection.
        """
        collection = self.get_object()

        # Check if the user has write permission
        if not collection.has_object_write_permission(request):
            return Response(
                {"detail": "You do not have permission to remove files from this collection."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get the upload
        upload = get_object_or_404(uploads.models.UserUpload, public_id=upload_id)

        # Check if the upload is in the collection
        if upload not in collection.uploads.all():
            return Response(
                {"detail": "The specified file is not in this collection."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Set the collection state to waiting
        collection.state = tools.models.PaperQACollection.States.WAITING
        collection.save(update_fields=["state"])

        # Remove the upload from the collection
        collection.uploads.remove(upload)

        # Trigger the index update task
        tools.tasks.update_collection_index.delay(collection.id)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(  # type: ignore[type-var]
        detail=True, methods=["post"], serializer_class=tools.serializers.LocalPDFQuerySerializer
    )
    async def query(self, request: "rest_framework.request.Request", public_id: str) -> Response:
        """
        Query the PaperQA collection.
        """
        collection = await sync_to_async(self.get_object)()

        # Check if the collection is in a state where it can be queried
        if collection.state == tools.models.PaperQACollection.States.PROCESSING:
            return Response(
                {"detail": "The collection is currently being processed. Please try again later."},
                status=status.HTTP_409_CONFLICT,
            )
        elif collection.state == tools.models.PaperQACollection.States.WAITING:
            # Trigger the index update task if it's in waiting state
            tools.tasks.update_collection_index.delay(collection.id)
            return Response(
                {"detail": "The collection is waiting to be processed. Please try again later."},
                status=status.HTTP_409_CONFLICT,
            )
        elif collection.state == tools.models.PaperQACollection.States.ERROR:
            return Response(
                {"detail": "The collection is in an error state. Please contact an administrator."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Define the directories for PDFs and indices
        pdf_dir = Path(settings.MEDIA_ROOT) / "paperqa" / "pdfs" / str(collection.public_id)
        index_dir = Path(settings.MEDIA_ROOT) / "paperqa" / "indices" / str(collection.public_id)

        # Create directories if they don't exist
        pdf_dir.mkdir(parents=True, exist_ok=True)
        index_dir.mkdir(parents=True, exist_ok=True)

        # Fetch and unpack the index if it exists
        if collection.index:
            with zipfile.ZipFile(io.BytesIO(collection.index)) as zf:
                zf.extractall(index_dir)

        # # Download files from object storage to the pdf directory
        # uploads = await sync_to_async(collection.uploads.all)()
        # for upload in uploads:
        #     if upload.content_type == "application/pdf":
        #         # Get the file URL
        #         file_url = upload.file.url
        #
        #         # Download the file
        #         response = await sync_to_async(requests.get)(file_url)
        #         if response.status_code == 200:
        #             # Save the file to the temporary directory
        #             file_path = pdf_dir / upload.name
        #             with open(file_path, 'wb') as f:
        #                 f.write(response.content)

        # Configure PaperQA settings
        self.paperqa_settings = Settings(
            temperature=0.5,
            paper_directory=str(pdf_dir),
            index_directory=str(index_dir),
        )
        self.paperqa_settings.agent.rebuild_index = False

        try:
            serializer = tools.serializers.LocalPDFQuerySerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            if validated_data.get("model"):
                self.paperqa_settings.llm = validated_data["model"]
                self.paperqa_settings.summary_llm = validated_data["model"]
            if validated_data.get("embedding_model"):
                self.paperqa_settings.embedding = validated_data["embedding_model"]
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

        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise PaperQAError(
                detail="An unexpected error occurred. Please try again later."
            ) from exc


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
