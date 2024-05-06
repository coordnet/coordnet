import typing

import factory
import factory.fuzzy
from factory.django import DjangoModelFactory

from nodes import models
from permissions.tests.factories import BaseMembershipModelMixinFactory


def content_for_text(text: str) -> list:
    return [{"type": "paragraph", "content": [{"text": text, "type": "text"}]}]


class NodeFactory(BaseMembershipModelMixinFactory):
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
        skip_postgeneration_save = True

    def __init__(self, *args: typing.Any, **kwargs: typing.Any):
        super().__init__(*args, **kwargs)
        if self.content is None:
            self.content = content_for_text(str(self.text))

    @factory.post_generation
    def space(self, create: bool, extracted: "models.Space", **kwargs: typing.Any) -> None:
        if not create:
            # Simple build, do nothing.
            return

        if extracted:
            # A space was passed in, use it
            extracted.nodes.add(self)


class DocumentFactory(DjangoModelFactory):
    public_id = factory.Faker("uuid4")
    json = factory.Faker("json")

    class Meta:
        model = "nodes.Document"


class SpaceFactory(BaseMembershipModelMixinFactory):
    title = factory.Faker("sentence", nb_words=6)

    class Meta:
        model = "nodes.Space"


class DocumentEventFactory(DjangoModelFactory):
    class Meta:
        model = "nodes.DocumentEvent"


class DocumentVersionFactory(DjangoModelFactory):
    public_id = factory.Faker("uuid4")
    document = factory.SubFactory(DocumentFactory)
    document_type = factory.fuzzy.FuzzyChoice(models.DocumentType.choices, getter=lambda c: c[0])
    json_hash = factory.Faker("sha256")

    class Meta:
        model = "nodes.DocumentVersion"
