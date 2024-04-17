import typing
from urllib.parse import urljoin

from django.conf import settings

if typing.TYPE_CHECKING:
    from django.http import HttpRequest
    from rest_framework.request import Request


def build_absolute_url(request: "Request | HttpRequest | None", path: str) -> str:
    if settings.FRONTEND_URL:
        return urljoin(settings.FRONTEND_URL, path)

    if request:
        return request.build_absolute_uri(path)

    raise ValueError("Either request or FRONTEND_URL must be provided.")
