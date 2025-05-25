import typing

import factory.fuzzy
from factory.django import DjangoModelFactory

import buddies.tests.factories as buddies_factories
from nodes import models
from permissions import utils
from permissions.tests.factories import BaseMembershipModelMixinFactory


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
    space = factory.SubFactory("nodes.tests.factories.SpaceFactory")
    node_type = models.NodeType.DEFAULT

    class Meta:
        model = "nodes.Node"
        skip_postgeneration_save = True

    def __init__(self, *args: typing.Any, **kwargs: typing.Any):
        super().__init__(*args, **kwargs)
        if self.content is None:
            self.content = content_for_text(str(self.text))


class MethodNodeFactory(BaseMembershipModelMixinFactory):
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
    document = factory.SubFactory(DocumentFactory)
    document_type = factory.fuzzy.FuzzyChoice(models.DocumentType.choices, getter=lambda c: c[0])
    json_hash = factory.Faker("sha256")

    class Meta:
        model = "nodes.DocumentVersion"


class MethodeNodeFactory(NodeFactory):
    buddy = factory.SubFactory(buddies_factories.BuddyFactory)

    class Meta:
        model = "nodes.MethodNode"


class MethodNodeVersionFactory(DjangoModelFactory):
    method = factory.SubFactory(MethodeNodeFactory)
    version = factory.Sequence(lambda n: n)
    method_data = factory.Faker("json", num_rows=50)

    class Meta:
        model = "nodes.MethodNodeVersion"


class MethodNodeRunFactory(BaseMembershipModelMixinFactory):
    method = factory.SubFactory(MethodeNodeFactory)
    method_version = factory.SubFactory(MethodNodeVersionFactory)
    user = factory.SubFactory("users.tests.factories.UserFactory")
    space = factory.SubFactory(SpaceFactory)

    method_data = factory.Faker("json", num_rows=50)

    class Meta:
        model = "nodes.MethodNodeRun"

    @factory.post_generation
    def post_create(self, create: bool, extracted: typing.Any, **kwargs: typing.Any) -> None:
        """
        Set the user as the owner if no owner was explicitly provided.
        This ensures backward compatibility with existing tests.
        """
        if not create:
            # Simple build, do nothing.
            return

        # If no owner was explicitly provided, use the user field as the owner
        if not self.members.filter(role__role="owner").exists():
            self.members.create(user=self.user, role=utils.get_owner_role())
