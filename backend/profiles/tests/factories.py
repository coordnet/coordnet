import factory.django
from django.db.models.signals import post_save

import profiles.models


@factory.django.mute_signals(post_save)
class ProfileFactory(factory.django.DjangoModelFactory[profiles.models.Profile]):
    class Meta:
        model = "profiles.Profile"
        abstract = True

    title = factory.Faker("sentence", nb_words=4)
    draft = True
    # profile_image_original = factory.django.ImageField()
    # banner_image_original = factory.django.ImageField()
    description = factory.Faker("text")
    profile_slug = factory.Faker("slug")


class UserProfileFactory(ProfileFactory):
    user = factory.SubFactory("users.tests.factories.UserFactory")
    space = None


class SpaceProfileFactory(ProfileFactory):
    user = None
    space = factory.SubFactory("nodes.tests.factories.SpaceFactory")


class ProfileCardFactory(factory.django.DjangoModelFactory[profiles.models.ProfileCard]):
    class Meta:
        model = "profiles.ProfileCard"

    title = factory.Faker("sentence", nb_words=4)
    description = factory.Faker("text")
    url = factory.Faker("url")
    created_by = factory.SubFactory("users.tests.factories.UserFactory")
    draft = False
