import factory
from factory.django import DjangoModelFactory


class NodeFactory(DjangoModelFactory):
    """
    Factory for creating nodes.
    Note: The token counts are calculated by splitting the title and text fields by
          spaces to improve performance and make testing easier.
    """

    title = factory.Faker("sentence", nb_words=6)
    text = factory.Faker("text")
    title_token_count = factory.LazyAttribute(lambda obj: len(obj.title.split()))
    text_token_count = factory.LazyAttribute(lambda obj: len(obj.text.split()))
    # TODO: Add a better faker that created valid content.
    content = factory.Faker("pydict", value_types=(str, int, float))

    class Meta:
        model = "nodes.Node"


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
