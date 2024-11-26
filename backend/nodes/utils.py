import typing


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
