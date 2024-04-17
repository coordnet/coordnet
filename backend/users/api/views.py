import typing

from django.contrib.auth import get_user_model, logout, update_session_auth_hash
from django_rest_passwordreset.models import ResetPasswordToken
from django_rest_passwordreset.serializers import ResetTokenSerializer
from knox.views import LoginView as KnoxLoginView
from rest_framework import status
from rest_framework.authentication import BasicAuthentication
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin, UpdateModelMixin
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from users.api.serializers import (
    PasswordChangeSerializer,
    RegisterSerializer,
    UserSerializer,
)

if typing.TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser
    from django.db.models import QuerySet
    from rest_framework.request import Request


User = get_user_model()


class UserViewSet(RetrieveModelMixin, ListModelMixin, UpdateModelMixin, GenericViewSet):
    serializer_class = UserSerializer
    queryset = User.objects.all()
    lookup_field = "public_id"
    permission_classes = (IsAuthenticated,)

    def get_queryset(self, *args: typing.Any, **kwargs: typing.Any) -> "QuerySet[AbstractUser]":
        assert isinstance(self.request.user.id, int)
        return self.queryset.filter(id=self.request.user.id)

    @action(detail=False)
    def me(self, request: "Request") -> Response:
        serializer = UserSerializer(request.user, context={"request": request})
        return Response(status=status.HTTP_200_OK, data=serializer.data)


class RegisterAPIView(CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


class DeleteUserAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request: "Request") -> Response:
        request._auth.delete()
        logout(request)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LoginView(KnoxLoginView):
    authentication_classes = (BasicAuthentication,)


class VerifyEmailView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request: "Request", *args: typing.Any, **kwargs: typing.Any) -> Response:
        return self.post(request, from_get=True)

    def post(self, request: "Request", from_get: bool = False) -> Response:
        data = self.request.query_params if from_get else self.request.data
        serializer = ResetTokenSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        try:
            token = ResetPasswordToken.objects.get(key=serializer.validated_data["token"])
        except ResetPasswordToken.DoesNotExist:
            return Response("Verification link is invalid.", status=status.HTTP_404_NOT_FOUND)
        token.user.is_active = True
        token.user.save()
        token.delete()
        return Response()


class PasswordChangeView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request: "Request") -> Response:
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        update_session_auth_hash(request, request.user)  # type: ignore[arg-type]
        # TODO: Consider deleting all auth-tokens except the one of the current session here.

        return Response()
