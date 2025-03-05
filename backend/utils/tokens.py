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

    if model == "gpt-3.5-turbo-0301":
        tokens_per_message = 4  # every message follows <|start|>{role/name}\n{content}<|end|>\n
        tokens_per_name = -1  # if there's a name, the role is omitted
    else:
        tokens_per_message = 3
        tokens_per_name = 1

    num_tokens = 0
    for message in messages:
        num_tokens += tokens_per_message
        for key, value in message.items():
            num_tokens += len(encoding.encode(str(value)))
            if key == "name":
                num_tokens += tokens_per_name
    num_tokens += 3  # every reply is primed with <|start|>assistant<|message|>
    return num_tokens
