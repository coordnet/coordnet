# ruff: noqa: E402
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

import sys
from pathlib import Path

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

import buddies.urls
from utils.middlewares import DRFAuthMiddlewareStack

# This allows easy placement of apps within the interior coordnet directory.
BASE_DIR = Path(__file__).resolve(strict=True).parent.parent
sys.path.append(str(BASE_DIR / "coordnet"))


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            DRFAuthMiddlewareStack(URLRouter(buddies.urls.websocket_urlpatterns))
        ),
    }
)
