import os
import typing

import openai
from django.conf import settings
from django.core.checks import Error, register

if os.getenv("HTTP_PROXY") is not None and os.getenv("HTTPS_PROXY") is not None:
    proxies = {"http://": os.getenv("HTTP_PROXY"), "https://": os.getenv("HTTPS_PROXY")}
else:
    proxies = None


@register("OpenAI")
def check_openai_credentials(app_configs: typing.Any, **kwargs: typing.Any) -> list[Error]:
    errors = []
    if settings.OPENAI_API_KEY is None and (
        settings.AZURE_OPENAI_API_KEY is None or settings.AZURE_OPENAI_ENDPOINT is None
    ):
        errors.append(
            Error(
                "Either OPENAI_API_KEY or AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT"
                " need to be provided.",
                id="OpenAI.E001",
            )
        )
    return errors


def get_openai_client() -> openai.OpenAI | openai.AzureOpenAI:
    """
    Get an OpenAI client, depending on the settings.
    We will prefer the Azure OpenAI client if both are set, since we assume that the user prefers
    to use their own endpoint.
    """
    if settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_ENDPOINT:
        return openai.AzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            http_client=openai.DefaultHttpxClient(mounts=proxies),
            http_async_client=openai.DefaultAsyncHttpxClient(mounts=proxies),
        )

    return openai.OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL)


def get_async_openai_client() -> openai.AsyncOpenAI | openai.AsyncAzureOpenAI:
    """
    Get an OpenAI client, depending on the settings.
    We will prefer the Azure OpenAI client if both are set, since we assume that the user prefers
    to use their own endpoint.
    """
    if settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_ENDPOINT:
        return openai.AsyncAzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            http_client=openai.DefaultHttpxClient(mounts=proxies),
            http_async_client=openai.DefaultAsyncHttpxClient(mounts=proxies),
        )

    return openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL)
