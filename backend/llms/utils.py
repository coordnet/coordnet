import typing

from django.conf import settings
from django.core.checks import Error, register

from llms.models import LLModel


@register("LLM")
def check_llm_credentials(app_configs: typing.Any, **kwargs: typing.Any) -> list[Error]:
    errors = []
    if settings.OPENAI_API_KEY is None and (
        settings.AZURE_OPENAI_API_KEY is None or settings.AZURE_OPENAI_ENDPOINT is None
    ):
        errors.append(
            Error(
                "Either OPENAI_API_KEY or AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT"
                " need to be provided.",
                id="LLM.E001",
            )
        )
    return errors


def get_llm_model(model_identifier: str) -> LLModel:
    """
    Get an LLModel instance by its identifier.
    If the model is not available, it will return a replacement model if one is configured.

    Args:
        model_identifier: The identifier of the model to get

    Returns:
        An LLModel instance that should be used

    Raises:
        LLModel.DoesNotExist: If the model does not exist or is disabled with no replacement
    """
    try:
        model = LLModel.objects.get(identifier=model_identifier)
        model_to_use = model.model_to_use
        if model_to_use is None:
            raise LLModel.DoesNotExist(
                f"Model {model_identifier} is disabled and has no valid replacement"
            )
        return model_to_use
    except LLModel.DoesNotExist:
        # Try to find a model with the given identifier as a fallback
        try:
            return LLModel.objects.get(identifier=model_identifier, disabled=False)
        except LLModel.DoesNotExist as exc:
            raise LLModel.DoesNotExist(f"Model {model_identifier} does not exist") from exc


def get_default_llm_model() -> LLModel:
    """
    Get the default LLModel instance.
    This will be the first available model that is not disabled.

    Returns:
        An LLModel instance that should be used

    Raises:
        LLModel.DoesNotExist: If no available models exist
    """
    model = LLModel.objects.filter(is_available=True, disabled=False).first()
    if model is None:
        raise LLModel.DoesNotExist("No available LLM models found")
    return model
