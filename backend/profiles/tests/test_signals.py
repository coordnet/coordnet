import nodes.tests.factories as node_factories
import profiles.models
import users.tests.factories as user_factories
from utils.testcases import BaseTransactionTestCase


class SignalTestCase(BaseTransactionTestCase):
    def test_space_creation(self) -> None:
        space = node_factories.SpaceFactory()
        self.assertEqual(profiles.models.Profile.objects.filter(space=space).count(), 1)
        profile = profiles.models.Profile.objects.first()
        assert profile is not None
        self.assertTrue(profile.draft)

    def test_user_creation(self) -> None:
        user = user_factories.UserFactory()
        self.assertEqual(profiles.models.Profile.objects.filter(user=user).count(), 1)
        profile = profiles.models.Profile.objects.first()
        assert profile is not None
        self.assertTrue(profile.draft)
