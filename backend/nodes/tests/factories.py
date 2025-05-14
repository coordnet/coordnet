import typing

import factory.fuzzy
from factory.django import DjangoModelFactory

import buddies.tests.factories as buddies_factories
from nodes import models
from permissions.tests.factories import BaseMembershipModelMixinFactory


def content_for_text(text: str) -> list:
    return [{"type": "paragraph", "content": [{"text": text, "type": "text"}]}]


T = typing.TypeVar("T", default=models.Node)


class NodeFactory(DjangoModelFactory[T], typing.Generic[T]):
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
    space = factory.SubFactory("nodes.tests.factories.SpaceFactory")
    node_type = models.NodeType.DEFAULT

    class Meta:
        model = "nodes.Node"
        skip_postgeneration_save = True

    def __init__(self, *args: typing.Any, **kwargs: typing.Any):
        super().__init__(*args, **kwargs)
        if self.content is None:
            self.content = content_for_text(str(self.text))


class MethodNodeFactory(BaseMembershipModelMixinFactory[models.MethodNode]):
    """Factory for creating method nodes."""

    title = factory.Faker("sentence", nb_words=6)
    text = factory.Faker("text")
    title_token_count = factory.LazyAttribute(
        lambda obj: len(obj.title.split()) if obj.title is not None else None
    )
    text_token_count = factory.LazyAttribute(
        lambda obj: len(obj.text.split()) if obj.title is not None else None
    )
    content = None
    space = factory.SubFactory("nodes.tests.factories.SpaceFactory")
    node_type = models.NodeType.METHOD

    class Meta:
        model = "nodes.MethodNode"
        skip_postgeneration_save = True

    def __init__(self, *args: typing.Any, **kwargs: typing.Any):
        super().__init__(*args, **kwargs)
        if self.content is None:
            self.content = content_for_text(str(self.text))


class DocumentFactory(DjangoModelFactory[models.Document]):
    public_id = factory.Faker("uuid4")
    json = factory.Faker("json")

    class Meta:
        model = "nodes.Document"


class SpaceFactory(BaseMembershipModelMixinFactory[models.Space]):
    title = factory.Faker("sentence", nb_words=6)

    class Meta:
        model = "nodes.Space"


class DocumentEventFactory(DjangoModelFactory[models.DocumentEvent]):
    class Meta:
        model = "nodes.DocumentEvent"


class DocumentVersionFactory(DjangoModelFactory[models.DocumentVersion]):
    document = factory.SubFactory(DocumentFactory)
    document_type = factory.fuzzy.FuzzyChoice(models.DocumentType.choices, getter=lambda c: c[0])
    json_hash = factory.Faker("sha256")

    class Meta:
        model = "nodes.DocumentVersion"


class MethodeNodeFactory(NodeFactory[models.MethodNode]):
    buddy = factory.SubFactory(buddies_factories.BuddyFactory)

    class Meta:
        model = "nodes.MethodNode"


class MethodNodeVersionFactory(DjangoModelFactory[models.MethodNodeVersion]):
    method = factory.SubFactory(MethodeNodeFactory)
    version = factory.Sequence(lambda n: n)
    method_data = factory.Faker("json", num_rows=50)

    class Meta:
        model = "nodes.MethodNodeVersion"


class MethodNodeRunFactory(DjangoModelFactory[models.MethodNodeRun]):
    method = factory.SubFactory(MethodeNodeFactory)
    method_version = factory.SubFactory(MethodNodeVersionFactory)
    user = factory.SubFactory("users.tests.factories.UserFactory")
    space = factory.SubFactory(SpaceFactory)

    method_data = factory.Faker("json", num_rows=50)

    class Meta:
        model = "nodes.MethodNodeRun"
