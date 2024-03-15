import typing

from django.conf import settings

if typing.TYPE_CHECKING:
    from django.http import HttpRequest


def allauth_settings(request: "HttpRequest") -> dict[str, bool]:
    """Expose some settings from django-allauth in templates."""
    return {"ACCOUNT_ALLOW_REGISTRATION": settings.ACCOUNT_ALLOW_REGISTRATION}
