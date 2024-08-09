import typing
from functools import wraps

from django.middleware.gzip import GZipMiddleware

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
