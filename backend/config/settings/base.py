"""
Base settings to build other settings files upon.
"""

from __future__ import annotations

import typing
import warnings
from datetime import timedelta
from pathlib import Path

import environ

if typing.TYPE_CHECKING:
    import django_stubs_ext

    # For type checking
    django_stubs_ext.monkeypatch()

    # This is needed until https://github.com/typeddjango/django-stubs/pull/2440 is merged.
    import mypy_django_plugin.lib.helpers
    from mypy.nodes import TypeInfo
    from mypy_django_plugin.lib.helpers import is_model_type as patch

    allowlist = {
        "dotted.path.to.your.ModelClass",
    }

    def is_model_type(info: TypeInfo) -> bool:
        if info.fullname in allowlist:
            return True
        return patch(info)

    mypy_django_plugin.lib.helpers.is_model_type = is_model_type

BASE_DIR = Path(__file__).resolve(strict=True).parent.parent.parent
# coordnet/
APPS_DIR = BASE_DIR / "coordnet"
env = environ.Env()

READ_DOT_ENV_FILE = env.bool("DJANGO_READ_DOT_ENV_FILE", default=False)
if READ_DOT_ENV_FILE:
    # OS environment variables take precedence over variables from .env
    env.read_env(str(BASE_DIR / ".env"))

# GENERAL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#debug
DEBUG = env.bool("DJANGO_DEBUG", False)
# Local time zone. Choices are
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# though not all of them may be available with every OS.
# In Windows, this must be set to your system time zone.
TIME_ZONE = "UTC"
# https://docs.djangoproject.com/en/dev/ref/settings/#language-code
LANGUAGE_CODE = "en-us"
# https://docs.djangoproject.com/en/dev/ref/settings/#languages
# from django.utils.translation import gettext_lazy as _
# LANGUAGES = [
#     ('en', _('English')),
#     ('fr-fr', _('French')),
#     ('pt-br', _('Portuguese')),
# ]
# https://docs.djangoproject.com/en/dev/ref/settings/#site-id
# SITE_ID = 1
# https://docs.djangoproject.com/en/dev/ref/settings/#use-i18n
USE_I18N = True
# https://docs.djangoproject.com/en/dev/ref/settings/#use-tz
USE_TZ = True
# https://docs.djangoproject.com/en/dev/ref/settings/#locale-paths
LOCALE_PATHS = [str(BASE_DIR / "locale")]

# DATABASES
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#databases
if "DATABASE_URL" in env:
    DATABASES = {
        "default": env.db("DATABASE_URL"),
        "direct": env.db("DIRECT_DATABASE_URL", env.str("DATABASE_URL")),
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB"),
            "USER": env("POSTGRES_USER"),
            "PASSWORD": env("POSTGRES_PASSWORD"),
            "HOST": env("POSTGRES_HOST"),
            "PORT": env("POSTGRES_PORT", default="5432"),
        }
    }

# https://docs.djangoproject.com/en/stable/ref/settings/#std:setting-DEFAULT_AUTO_FIELD
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# URLS
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#root-urlconf
ROOT_URLCONF = "config.urls"
# https://docs.djangoproject.com/en/dev/ref/settings/#wsgi-application
WSGI_APPLICATION = "config.wsgi.application"

# APPS
# ------------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    # "django.contrib.sites",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # "django.contrib.humanize", # Handy template tags
    "django.contrib.admin",
    "django.forms",
]
THIRD_PARTY_APPS = [
    "crispy_forms",
    "crispy_bootstrap5",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "django_celery_beat",
    "rest_framework",
    "rest_framework.authtoken",
    "knox",
    "rest_framework_simplejwt",
    "django_rest_passwordreset",
    "corsheaders",
    "drf_spectacular",
    "dry_rest_permissions",
    "django_filters",
    "pgtrigger",
    "adrf",
    "storages",
    "imagekit",
]

LOCAL_APPS = [
    "users",
    "nodes",
    "buddies",
    "permissions",
    "profiles",
    "utils",
    "llms",
    "tools",
    "uploads",
]
# https://docs.djangoproject.com/en/dev/ref/settings/#installed-apps
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# AUTHENTICATION
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#authentication-backends
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]
# https://docs.djangoproject.com/en/dev/ref/settings/#auth-user-model
AUTH_USER_MODEL = "users.User"
# https://docs.djangoproject.com/en/dev/ref/settings/#login-redirect-url
LOGIN_REDIRECT_URL = "users:redirect"
# https://docs.djangoproject.com/en/dev/ref/settings/#login-url
LOGIN_URL = "account_login"

# PASSWORDS
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#password-hashers
PASSWORD_HASHERS = [
    # https://docs.djangoproject.com/en/dev/topics/auth/passwords/#using-argon2-with-django
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
]
# https://docs.djangoproject.com/en/dev/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# MIDDLEWARE
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#middleware
MIDDLEWARE = [
    "utils.middlewares.SelectiveGZipMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

# STATIC
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#static-root
STATIC_ROOT = str(BASE_DIR / "staticfiles")
# https://docs.djangoproject.com/en/dev/ref/settings/#static-url
STATIC_URL = "/static/"
# https://docs.djangoproject.com/en/dev/ref/contrib/staticfiles/#std:setting-STATICFILES_DIRS
STATICFILES_DIRS = [str(APPS_DIR / "static")]
# https://docs.djangoproject.com/en/dev/ref/contrib/staticfiles/#staticfiles-finders
STATICFILES_FINDERS = [
    "django.contrib.staticfiles.finders.FileSystemFinder",
    "django.contrib.staticfiles.finders.AppDirectoriesFinder",
]

# MEDIA
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#media-root
MEDIA_ROOT = str(APPS_DIR / "media")
# https://docs.djangoproject.com/en/dev/ref/settings/#media-url
MEDIA_URL = "/media/"

# TEMPLATES
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#templates
TEMPLATES = [
    {
        # https://docs.djangoproject.com/en/dev/ref/settings/#std:setting-TEMPLATES-BACKEND
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # https://docs.djangoproject.com/en/dev/ref/settings/#dirs
        "DIRS": [str(APPS_DIR / "templates")],
        # https://docs.djangoproject.com/en/dev/ref/settings/#app-dirs
        "APP_DIRS": True,
        "OPTIONS": {
            # https://docs.djangoproject.com/en/dev/ref/settings/#template-context-processors
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.template.context_processors.i18n",
                "django.template.context_processors.media",
                "django.template.context_processors.static",
                "django.template.context_processors.tz",
                "django.contrib.messages.context_processors.messages",
                "users.context_processors.allauth_settings",
            ],
        },
    }
]

# https://docs.djangoproject.com/en/dev/ref/settings/#form-renderer
FORM_RENDERER = "django.forms.renderers.TemplatesSetting"

# http://django-crispy-forms.readthedocs.io/en/latest/install.html#template-packs
CRISPY_TEMPLATE_PACK = "bootstrap5"
CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"

# FIXTURES
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#fixture-dirs
FIXTURE_DIRS = (str(APPS_DIR / "fixtures"),)

# SECURITY
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#session-cookie-httponly
SESSION_COOKIE_HTTPONLY = True
# https://docs.djangoproject.com/en/dev/ref/settings/#csrf-cookie-httponly
CSRF_COOKIE_HTTPONLY = True
# https://docs.djangoproject.com/en/dev/ref/settings/#x-frame-options
X_FRAME_OPTIONS = env("DJANGO_X_FRAME_OPTIONS", default="SAMEORIGIN")

# Simple JWT Configuration
# ------------------------------------------------------------------------------
SIMPLE_JWT = {
    "ALGORITHM": "RS512",
    "SIGNING_KEY": env.str("JWT_SIGNING_KEY", multiline=True),
    "VERIFYING_KEY": env.str("JWT_VERIFYING_KEY", multiline=True),
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
}

# EMAIL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#email-backend
EMAIL_BACKEND = env(
    "DJANGO_EMAIL_BACKEND",
    default="django.core.mail.backends.smtp.EmailBackend",
)
# https://docs.djangoproject.com/en/dev/ref/settings/#email-timeout
EMAIL_TIMEOUT = 5

# ADMIN
# ------------------------------------------------------------------------------
# Django Admin URL.
ADMIN_URL = "admin/"
# https://docs.djangoproject.com/en/dev/ref/settings/#admins
ADMINS = [("""Jann Kleen""", "jann@coordnet.dev")]
# https://docs.djangoproject.com/en/dev/ref/settings/#managers
MANAGERS = ADMINS
# https://cookiecutter-django.readthedocs.io/en/latest/settings.html#other-environment-settings
# Force the `admin` sign in process to go through the `django-allauth` workflow
DJANGO_ADMIN_FORCE_ALLAUTH = env.bool("DJANGO_ADMIN_FORCE_ALLAUTH", default=False)

# LOGGING
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#logging
# See https://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        }
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        # Logging SQL queries, which can be useful for debugging but is spammy.
        # "django.db.backends": {
        #     "level": "DEBUG",
        #     "handlers": ["console"],
        #     "propagate": False,
        # },
    },
    # "root": {"level": "DEBUG", "handlers": ["console"]},
}

# We'd like to see all deprecation warnings in our test suite and during development,
# this will be disabled in the production settings.
warnings.simplefilter("always", DeprecationWarning)

# STORAGES
# ------------------------------------------------------------------------------
# https://django-storages.readthedocs.io/en/latest/#installation

# Get the storage backend
STORAGE_BACKEND = env.str("DJANGO_STORAGE_BACKEND", "storages.backends.s3.S3Storage")

# Define storage options based on the selected backend
storage_options = {}

# S3 Storage options
if STORAGE_BACKEND == "storages.backends.s3.S3Storage":
    storage_options = {
        # Fly.io Tigris
        # The strange environment variable names are based on what Fly.io provides when setting
        # up Tigris.
        "endpoint_url": env.str("AWS_ENDPOINT_URL_S3", None),
        "region_name": env.str("AWS_REGION", None),
        "bucket_name": env.str("BUCKET_NAME", None),
        "default_acl": "private",
        "querystring_auth": env.bool("AWS_QUERYSTRING_AUTH", True),
        "querystring_expire": env.int("AWS_QUERYSTRING_EXPIRE", 3600 * 12),
        "location": env.str("AWS_LOCATION", ""),
        "custom_domain": env.str("AWS_S3_CUSTOM_DOMAIN", None),
        "url_protocol": env.str("AWS_S3_URL_PROTOCOL", "https:"),
        "addressing_style": env.str("AWS_S3_ADDRESSING_STYLE", None),
    }
# Azure Storage options
elif STORAGE_BACKEND == "storages.backends.azure_storage.AzureStorage":
    storage_options = {
        "azure_container": env.str("AZURE_CONTAINER", None),
        "account_name": env.str("AZURE_ACCOUNT_NAME", None),
        "account_key": env.str("AZURE_ACCOUNT_KEY", None),
        "custom_domain": env.str("AZURE_CUSTOM_DOMAIN", None),
        "azure_ssl": env.bool("AZURE_SSL", True),
        "connection_string": env.str("AZURE_CONNECTION_STRING", None),
        "token_credential": None,  # This needs to be set programmatically if used
        "overwrite_files": env.bool("AZURE_OVERWRITE_FILES", True),  # We expect this to be true
        "location": env.str("AZURE_LOCATION", ""),
        "cache_control": env.str("AZURE_CACHE_CONTROL", None),
        "endpoint_suffix": env.str("AZURE_ENDPOINT_SUFFIX", None),
        "expiration_secs": env.int("AZURE_URL_EXPIRATION_SECS", 3600 * 12),
    }

STORAGES = {
    "default": {
        # The storage backend can be configured using the DJANGO_STORAGE_BACKEND environment
        # variable.
        # Options are:
        # - "storages.backends.s3.S3Storage" (default)
        # - "storages.backends.azure_storage.AzureStorage"
        "BACKEND": STORAGE_BACKEND,
        "OPTIONS": storage_options,
    },
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# Celery
# ------------------------------------------------------------------------------
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#std:setting-timezone
CELERY_TIMEZONE = TIME_ZONE
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#std:setting-broker_url
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=env("REDIS_URL"))
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#std:setting-result_backend
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#result-extended
CELERY_RESULT_EXTENDED = True
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#result-backend-always-retry
# https://github.com/celery/celery/pull/6122
CELERY_RESULT_BACKEND_ALWAYS_RETRY = True
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#result-backend-max-retries
CELERY_RESULT_BACKEND_MAX_RETRIES = 10
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#std:setting-accept_content
CELERY_ACCEPT_CONTENT = ["json"]
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#std:setting-task_serializer
CELERY_TASK_SERIALIZER = "json"
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#std:setting-result_serializer
CELERY_RESULT_SERIALIZER = "json"
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#task-time-limit
# TODO: set to whatever value is adequate in your circumstances
CELERY_TASK_TIME_LIMIT = 5 * 60
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#task-soft-time-limit
# TODO: set to whatever value is adequate in your circumstances
CELERY_TASK_SOFT_TIME_LIMIT = 60
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#beat-scheduler
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#worker-send-task-events
CELERY_WORKER_SEND_TASK_EVENTS = True
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#std-setting-task_send_sent_event
CELERY_TASK_SEND_SENT_EVENT = True
# Only acknowledge tasks after they have been completed, so that we don't lose tasks even if the
# worker crashes. This can cause tasks to be executed twice if the worker crashes after the task
# has been executed but before the acknowledgement has been sent.
# https://docs.celeryq.dev/en/stable/userguide/configuration.html#std:setting-task_acks_late
CELERY_ACKS_LATE = True

CELERY_NODE_EXECUTION_QUEUE = env.str("CELERY_NODE_EXECUTION_QUEUE", "node_execution")

# django-allauth
# ------------------------------------------------------------------------------
ACCOUNT_ALLOW_REGISTRATION = env.bool("DJANGO_ACCOUNT_ALLOW_REGISTRATION", True)
# https://django-allauth.readthedocs.io/en/latest/configuration.html
ACCOUNT_AUTHENTICATION_METHOD = "email"
# https://django-allauth.readthedocs.io/en/latest/configuration.html
ACCOUNT_EMAIL_REQUIRED = True
# https://django-allauth.readthedocs.io/en/latest/configuration.html
ACCOUNT_USERNAME_REQUIRED = False
# https://django-allauth.readthedocs.io/en/latest/configuration.html
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
# https://django-allauth.readthedocs.io/en/latest/configuration.html
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
# https://django-allauth.readthedocs.io/en/latest/configuration.html
ACCOUNT_ADAPTER = "users.adapters.AccountAdapter"
# https://django-allauth.readthedocs.io/en/latest/forms.html
ACCOUNT_FORMS = {"signup": "users.forms.UserSignupForm"}
# https://django-allauth.readthedocs.io/en/latest/configuration.html
SOCIALACCOUNT_ADAPTER = "users.adapters.SocialAccountAdapter"
# https://django-allauth.readthedocs.io/en/latest/forms.html
SOCIALACCOUNT_FORMS = {"signup": "users.forms.UserSocialSignupForm"}

# django-rest-framework
# -------------------------------------------------------------------------------
# django-rest-framework - https://www.django-rest-framework.org/api-guide/settings/
REST_FRAMEWORK: typing.Mapping[str, typing.Any] = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "knox.auth.TokenAuthentication",
    ],
    # "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.AllowAny",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": ("utils.filters.BaseFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 100,
}

# django-cors-headers - https://github.com/adamchainz/django-cors-headers#setup
CORS_URLS_REGEX = r"^/api/.*$"

# By Default swagger ui is available only to admin user(s). You can change permission classes to
# change that See more configuration options at
# https://drf-spectacular.readthedocs.io/en/latest/settings.html#settings
SPECTACULAR_SETTINGS: dict[str, typing.Any] = {
    "TITLE": "coordnet API",
    "DESCRIPTION": "Documentation of API endpoints of coordnet",
    "VERSION": "1.0.0",
    "SERVE_PERMISSIONS": ["rest_framework.permissions.IsAdminUser"],
}

# Django Image Kit
# ------------------------------------------------------------------------------
# https://django-imagekit.readthedocs.io/en/latest/#configuration
# import imagekit.cachefiles.namers.source_name_as_path

IMAGEKIT_DEFAULT_CACHEFILE_BACKEND = "imagekit.cachefiles.backends.Simple"
IMAGEKIT_DEFAULT_CACHEFILE_STRATEGY = "imagekit.cachefiles.strategies.Optimistic"

# CRDT Settings
# ------------------------------------------------------------------------------
NODE_CRDT_KEY = env("NODE_CRDT_KEY", default="default")
NODE_CRDT_EVENTS_INTERVAL = env.int("NODE_CRDT_INTERVAL", default=60 * 5)
NODE_CRDT_EVENTS_TASK = env("NODE_CRDT_TASK", default="nodes.tasks.process_document_events")

# The interval at which we create document snapshots.
NODE_VERSIONING_INTERVAL = env.int("NODE_VERSIONING_INTERVAL", default=60 * 5)
# The interval at which the task is executed.
NODE_VERSIONING_TASK_INTERVAL = env.int("NODE_VERSIONING_INTERVAL", default=60)
NODE_VERSIONING_TASK = env("NODE_VERSIONING_TASK", default="nodes.tasks.document_versioning")

# LLMs
# ------------------------------------------------------------------------------
OPENAI_API_KEY = env("OPENAI_API_KEY", default=None)
OPENAI_BASE_URL = env("OPENAI_BASE_URL", default=None)
AZURE_OPENAI_API_KEY = env("AZURE_OPENAI_API_KEY", default=None)
AZURE_OPENAI_ENDPOINT = env("AZURE_OPENAI_ENDPOINT", default=None)
AZURE_OPENAI_API_VERSION = env("AZURE_OPENAI_API_VERSION", default="2024-09-01-preview")

# API settings
# ------------------------------------------------------------------------------

SEMANTIC_API_KEY = env("SEMANTIC_SCHOLAR_API_KEY", default="fake-key")

# Front-end config
# ------------------------------------------------------------------------------
API_URL = env("BACKEND_URL", default="https://app.coord.dev")
WEBSOCKET_URL = env("BACKEND_WS_URL", default="wss://app.coord.dev")
CRDT_URL = env("CRDT_URL", default="wss://ws.coord.dev")

# This is only needed as an override for local development, in production are hosting the
# frontend on the same domain as the backend.
FRONTEND_URL: str | None = env("FRONTEND_URL", default=None)
