import logging
import typing

import tiktoken
from django.conf import settings
from openai.types.chat import ChatCompletionMessageParam

logger = logging.getLogger(__name__)


def token_count(text: str | None, model: str = "gpt-4") -> int | None:
    """Count the number of tokens in a string."""
    if text is None:
        return None
    enc = tiktoken.encoding_for_model(model)
    return len(enc.encode(text))


# Copied from the OpenAI cookbook at:
# https://github.com/openai/openai-cookbook/blob/f1e13cfcc7e0f2a9015c562eede167b76b1d60fc/examples/How_to_count_tokens_with_tiktoken.ipynb
# License: MIT License
def num_tokens_from_messages(
    messages: typing.Iterable[ChatCompletionMessageParam], model: str = "gpt-3.5-turbo-0613"
) -> int:
    """Return the number of tokens used by a list of messages."""
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        print("Warning: model not found. Using cl100k_base encoding.")
        encoding = tiktoken.get_encoding("cl100k_base")
    if model in {
        "gpt-3.5-turbo-0613",
        "gpt-3.5-turbo-16k-0613",
        "gpt-4-0314",
        "gpt-4-32k-0314",
        "gpt-4-0613",
        "gpt-4-32k-0613",
    }:
        tokens_per_message = 3
        tokens_per_name = 1
    elif model == "gpt-3.5-turbo-0301":
        tokens_per_message = 4  # every message follows <|start|>{role/name}\n{content}<|end|>\n
        tokens_per_name = -1  # if there's a name, the role is omitted
    elif model in {
        *settings.O1_MODELS,
        "gpt-4o",
    }:
        logger.debug(
            f"Warning: Token counts for {model} will be inaccurate. Using gpt-4-0613 "
            "token counts."
        )
        return num_tokens_from_messages(messages, model="gpt-4-0613")
    elif "gpt-3.5-turbo" in model:
        logger.debug(
            "Warning: gpt-3.5-turbo may update over time. Returning num tokens assuming "
            "gpt-3.5-turbo-0613."
        )
        return num_tokens_from_messages(messages, model="gpt-3.5-turbo-0613")
    elif "gpt-4" in model:
        logger.debug(
            "Warning: gpt-4 may update over time. Returning num tokens assuming gpt-4-0613."
        )
        return num_tokens_from_messages(messages, model="gpt-4-0613")
    else:
        # TODO: This is a dead link, but I don't know what the new link is, they also link to it
        #       in their documentation at this point (2024-03-27).
        raise NotImplementedError(
            f"num_tokens_from_messages() is not implemented for model {model}. See "
            "https://github.com/openai/openai-python/blob/main/chatml.md for information on how "
            "messages are converted to tokens."
        )
    num_tokens = 0
    for message in messages:
        num_tokens += tokens_per_message
        for key, value in message.items():
            num_tokens += len(encoding.encode(str(value)))
            if key == "name":
                num_tokens += tokens_per_name
    num_tokens += 3  # every reply is primed with <|start|>assistant<|message|>
    return num_tokens
