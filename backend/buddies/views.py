import logging
import typing

import requests
from adrf.decorators import api_view
from django.conf import settings
from django.http import StreamingHttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from openai import AsyncStream
from openai.types.chat import ChatCompletion, ChatCompletionChunk
from rest_framework.decorators import action, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

import llms.utils
from buddies import models, serializers
from utils import middlewares, views

if typing.TYPE_CHECKING:
    from rest_framework.request import Request

logger = logging.getLogger(__name__)


@extend_schema(
    tags=["Buddies"],
)
@extend_schema_view(
    list=extend_schema(description="List available buddies.", summary="List buddies"),
    retrieve=extend_schema(description="Retrieve a single buddy.", summary="Retrieve buddy"),
    create=extend_schema(description="Create a new buddy.", summary="Create buddy"),
    update=extend_schema(description="Update a buddy.", summary="Update buddy"),
    partial_update=extend_schema(
        description="Partial update a buddy.", summary="Partial update buddy"
    ),
    destroy=extend_schema(description="Delete a buddy.", summary="Delete buddy"),
)
class BuddyModelViewSet(views.BaseModelViewSet):
    queryset = models.Buddy.available_objects.all()
    serializer_class = serializers.BuddySerializer

    @extend_schema(
        summary="Query a buddy",
        description="Query a buddy using the given nodes and level. The level defines the depth of "
        "the query, level 0 meaning that only the node detail page of the node specified is "
        "queried, level 1 includes the specified node's graph (subnodes), level 2 will also add "
        "the subnodes detail pages to the context, etc.",
        responses={(200, "text/event-stream"): OpenApiTypes.STR, 404: None},
    )
    @action(detail=True, methods=["post"], serializer_class=serializers.BuddyQuerySerializer)
    @middlewares.disable_gzip
    def query(self, request: "Request", public_id: str | None = None) -> StreamingHttpResponse:
        buddy = self.get_object()

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        nodes = validated_data.get("nodes")
        level = validated_data.get("level")
        message = validated_data.get("message") or ""

        return StreamingHttpResponse(
            buddy.query_model(nodes, level, message), content_type="text/event-stream"
        )

    @extend_schema(
        summary="Calculate token counts",
        description="Calculate the token counts for each level.",
        responses={200: dict[int, int], 404: None},
    )
    @action(detail=True, methods=["post"], serializer_class=serializers.BuddyQuerySerializer)
    def token_counts(self, request: "Request", public_id: str | None = None) -> Response:
        buddy = self.get_object()

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        nodes = validated_data.get("nodes")
        max_depth = validated_data.get("level")
        message = validated_data.get("message") or ""

        return Response(buddy.calculate_token_counts(nodes, max_depth, message))

    @extend_schema(
        summary="Query semantic scholar",
        description="Query the Semantic Scholar API.",
        parameters=[
            OpenApiParameter(name="query", type=str, required=True),
            OpenApiParameter(name="fields", type=str, required=True, many=True),
        ],
        responses={200: list[dict], 400: None, 500: None},  # TODO: Define the response schema
    )
    @action(detail=False, methods=["get"])
    def semantic(self, request: "Request") -> Response:
        query = request.query_params.get("query")
        if not query:
            return Response({"error": "Query parameter is required"}, status=HTTP_400_BAD_REQUEST)

        fields = request.query_params.getlist("fields")
        if not fields:
            return Response({"error": "Fields parameter is required"}, status=HTTP_400_BAD_REQUEST)

        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        headers = {"x-api-key": settings.SEMANTIC_API_KEY}
        params = {"query": query, "fields": ",".join(fields)}

        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            result = response.json()["data"]
            logger.info(f"Querying semantic: {result}")
            return Response(result)
        except requests.RequestException as e:
            logger.error(f"Error querying Semantic Scholar API: {str(e)}")
            return Response(
                {"error": "Error querying Semantic Scholar API"},
                status=HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except KeyError as e:
            logger.error(f"Unexpected format from Semantic Scholar API: {str(e)}")
            return Response(
                {"error": "Unexpected format from Semantic Scholar API"},
                status=HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return Response(
                {"error": "An unexpected error occurred"}, status=HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=["Buddies"],
    summary="OpenAI Proxy",
    description="Proxy to OpenAI's chat API.",
    request=serializers.OpenAIQuerySerializer,
    responses={200: OpenApiTypes.STR, 400: None, 500: None},
    deprecated=True,
)
@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
@middlewares.disable_gzip
async def proxy_to_openai(request: "Request") -> StreamingHttpResponse:
    validated_data = serializers.OpenAIQuerySerializer(data=request.data)
    validated_data.is_valid(raise_exception=True)

    response = await llms.llm.get_async_openai_client().chat.completions.create(
        **validated_data.validated_data
    )

    async def generate(
        resp: ChatCompletion | AsyncStream[ChatCompletionChunk],
    ) -> typing.AsyncGenerator[str, None]:
        if isinstance(resp, ChatCompletion):
            yield resp.model_dump_json()
            return

        async for chunk in resp:
            data = chunk.model_dump_json(exclude_unset=True)
            yield f"data: {data}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingHttpResponse(
        generate(response), content_type="text/event-stream", charset="utf-8"
    )
