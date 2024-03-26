import typing

from django.http import StreamingHttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action

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
        node = validated_data.get("node")
        level = validated_data.get("level")
        message = validated_data.get("message")

        return StreamingHttpResponse(
            buddy.query_model(node, level, message), content_type="text/event-stream"
        )