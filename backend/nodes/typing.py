import typing


class NodeData(typing.TypedDict):
    name: str
    content: dict[str, typing.Any] | None
    type: typing.Literal["node", "document"]
