import typing

import openai
from django.conf import settings
from django.db import models

from utils import models as utils_models
from utils import tokens

if typing.TYPE_CHECKING:
    from nodes import models as nodes_models


class Buddy(utils_models.BaseModel):
    """A buddy is a template used to query an LLM model."""

    name = models.CharField(max_length=255)
    description = models.TextField()
    model = models.CharField(max_length=255)
    system_message = models.TextField()

    def query_model(
        self, nodes: list["nodes_models.Node"], level: int, query: str
    ) -> typing.Generator[str, None, None]:
        """Query the buddy."""

        response = openai.Client(api_key=settings.OPENAI_API_KEY).chat.completions.create(
            model=self.model,
            messages=self.__get_messages(level, nodes, query),  # type: ignore[arg-type]
            stream=True,
            timeout=180,
        )
        try:
            for chunk in response:
                if chunk.choices[0].delta.content is not None:  # type: ignore[union-attr]
                    yield chunk.choices[0].delta.content  # type: ignore[union-attr]
        except Exception as exc:
            raise ValueError("Failed to query the model.") from exc

    def calculate_token_counts(
        self, nodes: list["nodes_models.Node"], max_depth: int, query: str
    ) -> dict[int, int]:
        """Calculate the token counts for each level."""
        nodes_at_depth = [node.fetch_subnodes((max_depth // 2) + 1) for node in nodes]
        max_depth_achieved = max(
            min(
                max(max(nodes_at_depth_node.keys()) for nodes_at_depth_node in nodes_at_depth) * 2
                - 1,
                max_depth,
            ),
            0,
        )

        token_counts: dict[int, int] = {}
        for depth in range(max_depth_achieved + 1):
            token_counts[depth] = tokens.num_tokens_from_messages(
                self.__get_messages(depth, nodes, query, nodes_at_depth), self.model
            )

        return token_counts

    def __get_messages(
        self,
        level: int,
        nodes: list["nodes_models.Node"],
        query: str,
        nodes_at_depth: list[dict[int, list["nodes_models.Node"]]] | None | list[None] = None,
    ) -> list[dict]:
        node_context: list[str] = []
        if nodes_at_depth is None:
            nodes_at_depth = [None] * len(nodes)

        for node, nodes_at_depth_node in zip(nodes, nodes_at_depth, strict=True):
            node_context.append(node.node_context_for_depth(level, nodes_at_depth_node))
        return [
            {
                "role": "system",
                "content": self.system_message
                + "\nCurrent text editor state:\n```\n"
                + "\n".join(node_context)
                + "\n```",
            },
            {"role": "user", "content": query},
        ]

    class Meta(utils_models.BaseModel.Meta):
        verbose_name_plural = "buddies"

    def __str__(self) -> str:
        return self.name
