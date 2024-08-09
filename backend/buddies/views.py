import typing

from adrf.decorators import api_view
from django.conf import settings
from django.http import StreamingHttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from openai import AsyncOpenAI, AsyncStream
from openai.types.chat import ChatCompletion, ChatCompletionChunk
from rest_framework.decorators import action, authentication_classes, permission_classes
from rest_framework.response import Response

from buddies import models, serializers
from utils import middlewares, views

if typing.TYPE_CHECKING:
    from rest_framework.request import Request


class BuddyModelViewSet(views.BaseModelViewSet):
    queryset = models.Buddy.available_objects.all()
    serializer_class = serializers.BuddySerializer

    @action(detail=True, methods=["post"], serializer_class=serializers.BuddyQuerySerializer)
    @extend_schema(
        responses={(200, "text/event-stream"): OpenApiTypes.STR, 404: None},
    )
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


@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
@middlewares.disable_gzip
async def proxy_to_openai(request: "Request") -> StreamingHttpResponse:
    openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    validated_data = serializers.OpenAIQuerySerializer(data=request.data)
    validated_data.is_valid(raise_exception=True)

    response = await openai_client.chat.completions.create(**validated_data.validated_data)

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
