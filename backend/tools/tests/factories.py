import factory

from permissions.tests.factories import BaseMembershipModelMixinFactory
from tools import models


class PaperQACollectionFactory(BaseMembershipModelMixinFactory):
    """Factory for creating PaperQACollection objects."""

    name = factory.Faker("slug")
    state = models.PaperQACollection.States.READY

    class Meta:
        model = models.PaperQACollection
