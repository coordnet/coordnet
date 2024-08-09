import typing
from functools import wraps

from asgiref.sync import sync_to_async
from channels.auth import AuthMiddlewareStack
from django.contrib.auth.models import AnonymousUser
from django.middleware.gzip import GZipMiddleware
from knox.auth import TokenAuthentication
from knox.settings import knox_settings
from rest_framework import exceptions

if typing.TYPE_CHECKING:
    from django.http import HttpRequest, HttpResponseBase


def disable_gzip(view_func: typing.Callable) -> typing.Callable:
    """
    Decorator to disable gzip compression for a view.
    """

    @wraps(view_func)
    def _wrapped_view(*args: typing.Any, **kwargs: typing.Any) -> "HttpResponseBase":
        response = view_func(*args, **kwargs)
        response.disable_gzip = True
        return response

    return _wrapped_view


class SelectiveGZipMiddleware(GZipMiddleware):
    def process_response(
        self, request: "HttpRequest", response: "HttpResponseBase"
    ) -> "HttpResponseBase":
        if getattr(response, "disable_gzip", False):
            return response
        return super().process_response(request, response)


class DRFTokenAuthMiddleware:
    def __init__(self, inner: typing.Callable):
        self.inner = inner

    async def __call__(self, scope: dict, receive: typing.Any, send: typing.Any) -> None:
        prefix = knox_settings.AUTH_HEADER_PREFIX.encode()
        headers = dict(scope["headers"])
        if b"authorization" in headers:
            auth = headers[b"authorization"]
            if isinstance(auth, str):
                # Workaround for Django Testing
                auth = headers[b"authorization"].encode()

            auth = auth.split()
            if not auth:
                scope["user"] = AnonymousUser()
            if auth[0].lower() != prefix.lower():
                # Authorization header is possibly for another backend
                scope["user"] = AnonymousUser()
            if len(auth) == 1:
                msg = "Invalid token header. No credentials provided."
                raise exceptions.AuthenticationFailed(msg)
            elif len(auth) > 2:
                msg = "Invalid token header. Token string should not contain spaces."
                raise exceptions.AuthenticationFailed(msg)

            token_auth = TokenAuthentication()
            user, _ = await sync_to_async(token_auth.authenticate_credentials)(auth[1])
            scope["user"] = user
        else:
            scope["user"] = AnonymousUser()
        return await self.inner(scope, receive, send)


def DRFAuthMiddlewareStack(inner: typing.Callable) -> typing.Callable:
    return DRFTokenAuthMiddleware(AuthMiddlewareStack(inner))
