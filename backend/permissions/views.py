import typing

from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.settings import api_settings

from permissions import models, serializers

if typing.TYPE_CHECKING:
    from rest_framework import request


class PermissionViewSetMixin(generics.GenericAPIView):
    @action(
        detail=True,
        methods=["get", "post"],
        url_path="permissions",
        serializer_class=serializers.ObjectPermissionModelSerializer,
    )
    def manage_permissions(self, request: "request.Request", public_id: str) -> Response:
        if request.method == "GET":
            print(
                serializers.ObjectPermissionModelSerializer(
                    self.get_object().members.all(), many=True
                ).data
            )
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

    @action(
        detail=True,
        methods=["delete"],
        url_path="permissions/(?P<permission_uuid>[0-9a-f-]+)",
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
