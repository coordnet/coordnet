# ruff: noqa: E402
import os
import typing

from django.core.asgi import get_asgi_application

if typing.TYPE_CHECKING:
    from django.core.handlers.asgi import ASGIHandler

try:
    from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
except ImportError:

    def SentryAsgiMiddleware(app: "ASGIHandler") -> "ASGIHandler":  # type: ignore[no-redef]
        return app


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = SentryAsgiMiddleware(get_asgi_application())

import sys
from pathlib import Path

import channels_auth_token_middlewares.middleware
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

import buddies.urls

# This allows easy placement of apps within the interior coordnet directory.
BASE_DIR = Path(__file__).resolve(strict=True).parent.parent
sys.path.append(str(BASE_DIR / "coordnet"))


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            channels_auth_token_middlewares.middleware.SimpleJWTAuthTokenMiddleware(
                URLRouter(buddies.urls.websocket_urlpatterns)
            ),
        ),
    }
)
