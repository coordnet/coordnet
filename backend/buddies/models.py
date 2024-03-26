import typing

import openai
from django.conf import settings
from django.db import models

from utils.models import BaseModel

if typing.TYPE_CHECKING:
    from nodes import models as nodes_models


class Buddy(BaseModel):
    """A buddy is a template used to query an LLM model."""

    name = models.CharField(max_length=255)
    description = models.TextField()
    model = models.CharField(max_length=255)
    system_message = models.TextField()

    def query_model(
        self, node: "nodes_models.Node", level: int, query: str
    ) -> typing.Generator[str, None, None]:
        """Query the buddy."""

        response = openai.Client(api_key=settings.OPENAI_API_KEY).chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": self.system_message
                    + "\nCurrent text editor state:\n```\n"
                    + node.node_context_for_depth(level)
                    + "\n```",
                },
                {"role": "user", "content": query},
            ],
            stream=True,
            timeout=180,
        )
        try:
            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
        except Exception as exc:
            raise ValueError("Failed to query the model.") from exc

    class Meta(BaseModel.Meta):
        verbose_name_plural = "buddies"

    def __str__(self) -> str:
        return self.name
