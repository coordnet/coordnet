import logging
import typing

import tiktoken
from openai.types.chat import ChatCompletionMessageParam

logger = logging.getLogger(__name__)


def token_count(text: str | None, model: str = "gpt-4") -> int | None:
    """Count the number of tokens in a string."""
    if text is None:
        return None
    enc = tiktoken.encoding_for_model(model)
    return len(enc.encode(text))


# Copied from the OpenAI cookbook at:
# https://github.com/openai/openai-cookbook/blob/db3144982aa26b87a9bdfb692b4fbedfdf8a14d5/examples/How_to_count_tokens_with_tiktoken.ipynb
# License: MIT License
def num_tokens_from_messages(
    messages: typing.Iterable[ChatCompletionMessageParam], model: str = "gpt-3.5-turbo-0613"
) -> int:
    """Return the number of tokens used by a list of messages."""
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        # This is different from the original code, which uses the o200k_base encoding, but for us,
        # cl100k_base is still the default.
        print("Warning: model not found. Using cl100k_base encoding.")
        encoding = tiktoken.get_encoding("cl100k_base")
    if model in {
        "gpt-3.5-turbo-0125",
        "gpt-4-0314",
        "gpt-4-32k-0314",
        "gpt-4-0613",
        "gpt-4-32k-0613",
        "gpt-4o-mini-2024-07-18",
        "gpt-4o-2024-08-06",
    }:
        tokens_per_message = 3
        tokens_per_name = 1
    elif model == "gpt-3.5-turbo-0301":
        tokens_per_message = 4  # every message follows <|start|>{role/name}\n{content}<|end|>\n
        tokens_per_name = -1  # if there's a name, the role is omitted
    elif "gpt-3.5-turbo" in model:
        return num_tokens_from_messages(messages, model="gpt-3.5-turbo-0125")
    elif "gpt-4o-mini" in model:
        return num_tokens_from_messages(messages, model="gpt-4o-mini-2024-07-18")
    elif "gpt-4o" in model:
        return num_tokens_from_messages(messages, model="gpt-4o-2024-08-06")
    elif "gpt-4" in model:
        return num_tokens_from_messages(messages, model="gpt-4-0613")
    elif "o1-" in model:
        # Note: This is our addition and I'm not sure if it returns the correct counts.
        return num_tokens_from_messages(messages, model="gpt-4o-2024-08-06")
    else:
        raise NotImplementedError(
            f"""num_tokens_from_messages() is not implemented for model {model}."""
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
