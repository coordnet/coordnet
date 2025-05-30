"""
With these settings, tests run faster.
"""

from .base import *  # noqa: F403
from .base import env

# GENERAL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#secret-key
SECRET_KEY = env(
    "DJANGO_SECRET_KEY",
    default="jax9phuPh9phocheeshoodahngoovei3Vipah5ego8ohRogheanaek3Aa7uotohv",
)

# https://docs.djangoproject.com/en/dev/ref/settings/#test-runner
TEST_RUNNER = "django.test.runner.DiscoverRunner"

# PASSWORDS
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#password-hashers
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# EMAIL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#email-backend
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# DEBUGGING FOR TEMPLATES
# ------------------------------------------------------------------------------
TEMPLATES[0]["OPTIONS"]["debug"] = True  # type: ignore[index] # noqa: F405

# MEDIA
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#media-url
MEDIA_URL = "http://media.testserver/"

# Browsable API
# ------------------------------------------------------------------------------
REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"].append(  # noqa: F405
    "rest_framework.authentication.SessionAuthentication"
)

# Your stuff...
# ------------------------------------------------------------------------------
EMAIL_SUBJECT_PREFIX = "[coordnet.dev - TEST]"

# OpenAI
# ------------------------------------------------------------------------------
# We don't want to actually call OpenAI in tests, but not setting it will trigger a check error.
OPENAI_API_KEY = "sk-test-123"

# Custom Storage configuration to reuse minio values
# ------------------------------------------------------------------------------
STORAGES["default"]["OPTIONS"].update(  # type: ignore[index]  # noqa: F405
    {
        "access_key": env.str("MINIO_ROOT_USER"),
        "secret_key": env.str("MINIO_ROOT_PASSWORD"),
        "default_acl": "download",
        # "custom_domain": env.str(
        #     "MINIO_CUSTOM_DOMAIN", default=f"localhost:9000/{env.str('BUCKET_NAME')}"
        # ),
        "url_protocol": "http:",
    }
)
