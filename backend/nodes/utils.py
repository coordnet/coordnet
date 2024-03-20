import random
import typing

import tiktoken

# def extract_nodes_from_json(
#     json: dict[str, typing.Any], document_id: str
# ) -> list[nodes_typing.NodeData]:
#     """
#     Extract nodes from a JSON object.
#     This will recursively extract nodes from the JSON object.
#     """
#
#     nodes: list[nodes_typing.NodeData] = [
#         {
#             "name": document_id,
#             "content": json[settings.NODE_CRDT_KEY],
#             "type": "document",
#         }
#     ]
#     return nodes + extract_coord_nodes(json[settings.NODE_CRDT_KEY])


# def extract_coord_nodes(data: dict | list) -> list[nodes_typing.NodeData]:
#     """Recursively extract CoordNode objects from a nested dictionary."""
#     nodes: list[nodes_typing.NodeData] = []
#     if isinstance(data, dict):
#         if data.get("type") == "CoordNode":
#             nodes.append(
#                 {
#                     "name": data.get("attrs", {}).get("id"),
#                     "content": data,
#                     "type": "node",
#                 }
#             )
#         for value in data.values():
#             nodes.extend(extract_coord_nodes(value))
#     elif isinstance(data, list):
#         for item in data:
#             nodes.extend(extract_coord_nodes(item))
#     return nodes


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
