import factory.django

import profiles.models


class ProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = profiles.models.Profile

    user = factory.SubFactory("users.tests.factories.UserFactory")
    title = factory.Faker("sentence", nb_words=4)
    is_public = True
    is_removed = False
    profile_image = factory.django.ImageField()
    banner_image = factory.django.ImageField()
    description = factory.Faker("text")
    profile_slug = factory.Faker("slug")
