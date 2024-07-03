import typing
from functools import wraps

from asgiref.sync import sync_to_async, iscoroutinefunction
from channels.auth import AuthMiddlewareStack
from django.contrib.auth.models import AnonymousUser
from django.middleware.gzip import GZipMiddleware
from django.utils.decorators import sync_and_async_middleware
from knox.auth import TokenAuthentication
from knox.settings import knox_settings
from rest_framework import exceptions

if typing.TYPE_CHECKING:
    from django.http import HttpRequest, HttpResponseBase


@sync_and_async_middleware
def disable_gzip(view_func: typing.Callable) -> typing.Callable:
    """
    Decorator to disable gzip compression for a view.
    """

    if iscoroutinefunction(view_func):

        @wraps(view_func)
        async def _wrapped_view(*args: typing.Any, **kwargs: typing.Any) -> "HttpResponseBase":
            response = await view_func(*args, **kwargs)
            response.disable_gzip = True
            return response

    else:

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
