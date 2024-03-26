import random
import typing

import tiktoken


def extract_text_from_node(node: dict[str, typing.Any] | list) -> list[str]:
    """Extract text from a node."""
    texts: list[str] = []
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "type" and value == "text":
                texts.append(node["text"])
            elif isinstance(value, (dict, list)):
                texts.extend(extract_text_from_node(value))
    elif isinstance(node, list):
        for item in node:
            texts.extend(extract_text_from_node(item))
    return texts


def token_count(text: str | None, model: str = "gpt-4") -> int | None:
    """Count the number of tokens in a string."""
    if text is None:
        return None
    enc = tiktoken.encoding_for_model(model)
    return len(enc.encode(text))


def random_string(length: int = 32) -> str:
    """Generate a random string."""
    return "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for i in range(length))
