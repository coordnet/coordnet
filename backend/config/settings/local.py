from .base import *  # noqa: F403
from .base import env

# GENERAL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#debug
DEBUG = True
# https://docs.djangoproject.com/en/dev/ref/settings/#secret-key
SECRET_KEY = env(
    "DJANGO_SECRET_KEY",
    default="eolooV0Emoo5aex2aeph9Eitai2Oth5Pie5reeMeyufa2ye2phu8shioj0sie4mi",
)
# https://docs.djangoproject.com/en/dev/ref/settings/#allowed-hosts
ALLOWED_HOSTS = ["localhost", "0.0.0.0", "127.0.0.1", "django"]

# CACHES
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#caches
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "",
    }
}

# EMAIL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#email-host
EMAIL_HOST = env("EMAIL_HOST", default="mailpit")
# https://docs.djangoproject.com/en/dev/ref/settings/#email-port
EMAIL_PORT = 1025

# WhiteNoise
# ------------------------------------------------------------------------------
# http://whitenoise.evans.io/en/latest/django.html#using-whitenoise-in-development
INSTALLED_APPS = ["whitenoise.runserver_nostatic"] + INSTALLED_APPS  # noqa: F405

# django-debug-toolbar
# ------------------------------------------------------------------------------
# https://django-debug-toolbar.readthedocs.io/en/latest/installation.html#prerequisites
INSTALLED_APPS += ["debug_toolbar"]
# https://django-debug-toolbar.readthedocs.io/en/latest/installation.html#middleware
MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]  # noqa: F405
# https://django-debug-toolbar.readthedocs.io/en/latest/configuration.html#debug-toolbar-config
DEBUG_TOOLBAR_CONFIG = {
    "DISABLE_PANELS": ["debug_toolbar.panels.redirects.RedirectsPanel"],
    "SHOW_TEMPLATE_CONTEXT": True,
}
# https://django-debug-toolbar.readthedocs.io/en/latest/installation.html#internal-ips
INTERNAL_IPS = ["127.0.0.1", "10.0.2.2"]
if env("USE_DOCKER") == "yes":
    import socket

    hostname, _, ips = socket.gethostbyname_ex(socket.gethostname())
    INTERNAL_IPS += [".".join(ip.split(".")[:-1] + ["1"]) for ip in ips]

# django-extensions
# ------------------------------------------------------------------------------
# https://django-extensions.readthedocs.io/en/latest/installation_instructions.html#configuration
INSTALLED_APPS += ["django_extensions"]
# Celery
# ------------------------------------------------------------------------------

# https://docs.celeryq.dev/en/stable/userguide/configuration.html#task-eager-propagates
CELERY_TASK_EAGER_PROPAGATES = True

# Browsable API
# ------------------------------------------------------------------------------
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"].append(  # noqa: F405
    "rest_framework.authentication.SessionAuthentication"
)

# Custom Storage configuration to reuse minio values
# ------------------------------------------------------------------------------
# Storage for browser access via signed URLs

STORAGES["default"]["OPTIONS"].update(  # type: ignore[index]  # noqa: F405
    {
        "access_key": env.str("MINIO_ROOT_USER"),
        "secret_key": env.str("MINIO_ROOT_PASSWORD"),
        "default_acl": "download",
        "custom_domain": env.str(
            "MINIO_CUSTOM_DOMAIN", default=f"localhost:9000/{env.str('BUCKET_NAME')}"
        ),
        "url_protocol": "http:",
    }
)
STORAGES["browser"] = {  # noqa: F405
    "BACKEND": "utils.storage.BrowserS3Storage",
    "OPTIONS": STORAGES["default"]["OPTIONS"],  # noqa: F405
}

# Storage for internal docker network access
STORAGES["internal"] = {  # noqa: F405
    "BACKEND": "utils.storage.InternalS3Storage",
    "OPTIONS": STORAGES["default"]["OPTIONS"],  # noqa: F405
}

# Your stuff...
# ------------------------------------------------------------------------------
EMAIL_SUBJECT_PREFIX = "[coordnet.dev - DEV]"
CORS_ORIGIN_ALLOW_ALL = True  # TODO: Fix this later
CORS_ALLOW_HEADERS = ["*"]

# ASGI support through Daphne
ASGI_APPLICATION = "config.asgi.application"
INSTALLED_APPS = ["daphne"] + INSTALLED_APPS
