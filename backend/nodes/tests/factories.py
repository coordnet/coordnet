import typing

import factory
from factory.django import DjangoModelFactory


def content_for_text(text: str) -> list:
    return [{"type": "paragraph", "content": [{"text": text, "type": "text"}]}]


class NodeFactory(DjangoModelFactory):
    """
    Factory for creating nodes.
    Note: The token counts are calculated by splitting the title and text fields by
          spaces to improve performance and make testing easier.
    """

    title = factory.Faker("sentence", nb_words=6)
    text = factory.Faker("text")
    title_token_count = factory.LazyAttribute(
        lambda obj: len(obj.title.split()) if obj.title is not None else None
    )
    text_token_count = factory.LazyAttribute(
        lambda obj: len(obj.text.split()) if obj.title is not None else None
    )
    content = None

    class Meta:
        model = "nodes.Node"

    def __init__(self, *args: typing.Any, **kwargs: typing.Any):
        super().__init__(*args, **kwargs)
        if self.content is None:
            self.content = content_for_text(str(self.text))


class DocumentFactory(DjangoModelFactory):
    class Meta:
        model = "nodes.Document"


class SpaceFactory(DjangoModelFactory):
    title = factory.Faker("sentence", nb_words=6)

    class Meta:
        model = "nodes.Space"


class DocumentEventFactory(DjangoModelFactory):
    class Meta:
        model = "nodes.DocumentEvent"
