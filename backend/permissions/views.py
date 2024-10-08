import typing

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.settings import api_settings

from permissions import models, serializers

if typing.TYPE_CHECKING:
    from rest_framework import request


T_co = typing.TypeVar("T_co", bound="models.MembershipModelMixin", covariant=True)


class PermissionViewSetMixin(generics.GenericAPIView[T_co], typing.Generic[T_co]):
    @extend_schema(
        methods=["post"],
        summary="Create object permission",
        description="Create a new object permission",
        responses={
            status.HTTP_201_CREATED: serializers.ObjectPermissionModelSerializer,
            status.HTTP_404_NOT_FOUND: None,
        },
    )
    @extend_schema(
        methods=["get"],
        summary="List object permissions",
        description="List all object permissions",
        responses={
            status.HTTP_200_OK: serializers.ObjectPermissionModelSerializer(many=True),
            status.HTTP_404_NOT_FOUND: None,
        },
    )
    @action(
        detail=True,
        methods=["get", "post"],
        url_path="permissions",
        serializer_class=serializers.ObjectPermissionModelSerializer,
        filter_backends=[],
    )
    def manage_permissions(self, request: "request.Request", public_id: str) -> Response:
        if request.method == "GET":
            return Response(self.get_serializer(self.get_object().members.all(), many=True).data)
        else:
            content_object = self.get_object()
            serializer = self.get_serializer(
                data=request.data, context={"content_object": content_object}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            try:
                headers = {"Location": str(serializer.validated_data[api_settings.URL_FIELD_NAME])}
            except (TypeError, KeyError):
                headers = {}

            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @extend_schema(
        methods=["delete"],
        summary="Delete object permission",
        description="Delete an object permission",
        parameters=[
            OpenApiParameter(
                name="permission_uuid",
                type=OpenApiTypes.UUID,
                location=OpenApiParameter.PATH,
                description="UUID of the permission to delete",
            )
        ],
        responses={status.HTTP_204_NO_CONTENT: None, status.HTTP_404_NOT_FOUND: None},
    )
    @action(
        detail=True,
        methods=["delete"],
        url_path=r"permissions/(?P<permission_uuid>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
        serializer_class=serializers.ObjectPermissionModelSerializer,
    )
    def delete_permission(
        self, request: "request.Request", public_id: str, permission_uuid: str
    ) -> Response:
        content_object = self.get_object()
        try:
            content_object.members.get(public_id=permission_uuid).delete()
        except models.ObjectMembership.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return Response(status=status.HTTP_204_NO_CONTENT)
