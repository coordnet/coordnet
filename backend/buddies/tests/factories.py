import factory
from factory.django import DjangoModelFactory


class BuddyFactory(DjangoModelFactory):
    name = factory.Faker("sentence", nb_words=6)
    description = factory.Faker("text")
    model = "gpt-3.5-turbo"

    class Meta:
        model = "buddies.Buddy"
