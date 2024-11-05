import logging
import typing

from django.conf import settings
from django.db import models
from openai.types.chat import ChatCompletion, ChatCompletionMessageParam

import utils.llm
import utils.tokens
from utils import models as utils_models

if typing.TYPE_CHECKING:
    from nodes import models as nodes_models

logger = logging.getLogger(__name__)


class Buddy(utils_models.SoftDeletableBaseModel):
    """A buddy is a template used to query an LLM model."""

    name = models.CharField(max_length=255)
    description = models.TextField()
    model = models.CharField(
        verbose_name="LLM Model",
        help_text="The LLM model this buddy will be using.",
        max_length=255,
    )
    system_message = models.TextField(
        help_text="The message sent to the LLM before the user's query."
    )

    @property
    def is_o1(self) -> bool:
        """Whether the model is an o1 model or not"""
        return self.model in settings.O1_MODELS

    def query_model(
        self, nodes: list["nodes_models.Node"], level: int, query: str
    ) -> typing.Generator[str, None, None]:
        """Query the buddy."""

        response = utils.llm.get_openai_client().chat.completions.create(
            model=self.model,
            messages=self._get_messages(level, nodes, query),
            stream=not self.is_o1,
            timeout=180,
        )

        try:
            if isinstance(response, ChatCompletion):
                try:
                    yield response.choices[0].message.content
                except (IndexError, AttributeError):
                    logger.warning("No content in non-streaming response.")
                    return
            else:
                for chunk in response:
                    try:
                        if (chunk_content := chunk.choices[0].delta.content) is not None:
                            yield chunk_content
                    except IndexError:
                        # Chunk choices are empty, for example when an Azure endpoint returns
                        # content moderation information instead.
                        continue
                    except AttributeError:
                        logger.exception(
                            "Unexpected format from OpenAI API, skipping chunk...",
                            exc_info=True,
                        )
                        continue

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
            token_counts[depth] = utils.tokens.num_tokens_from_messages(
                self._get_messages(depth, nodes, query, nodes_at_depth), self.model
            )

        return token_counts

    def _get_messages(
        self,
        level: int,
        nodes: list["nodes_models.Node"],
        query: str,
        nodes_at_depth: list[dict[int, list["nodes_models.Node"]]] | None | list[None] = None,
    ) -> typing.Iterable[ChatCompletionMessageParam]:
        node_context: list[str] = []
        if nodes_at_depth is None:
            nodes_at_depth = [None] * len(nodes)

        for node, nodes_at_depth_node in zip(nodes, nodes_at_depth, strict=True):
            node_context.append(node.node_context_for_depth(level, nodes_at_depth_node))

        system_prompt = str(
            self.system_message
            + "\nCurrent text editor state:\n```\n"
            + "\n".join(node_context)
            + "\n```",
        )

        if self.is_o1:
            return [
                {"role": "user", "content": system_prompt},
                {"role": "user", "content": query},
            ]
        else:
            return [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query},
            ]

    class Meta(utils_models.SoftDeletableBaseModel.Meta):
        verbose_name_plural = "buddies"

    def __str__(self) -> str:
        return self.name
