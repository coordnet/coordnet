from django import test
from rest_framework import test as drf_test

from permissions import models as permissions_models
from users.tests import factories as users_factories

TEST_SETTINGS = {
    "CELERY_TASK_ALWAYS_EAGER": True,
    "CELERY_TASK_EAGER_PROPAGATES": True,
    "PASSWORD_HASHERS": ("django.contrib.auth.hashers.UnsaltedMD5PasswordHasher",),
}


class BaseSetupTestCase:
    fixtures = ["roles"]

    def setUp(self) -> None:
        self.owner_role = permissions_models.ObjectMembershipRole.objects.get(
            role=permissions_models.RoleOptions.OWNER
        )
        self.member_role = permissions_models.ObjectMembershipRole.objects.get(
            role=permissions_models.RoleOptions.MEMBER
        )
        self.viewer_role = permissions_models.ObjectMembershipRole.objects.get(
            role=permissions_models.RoleOptions.VIEWER
        )

        self.owner_user = users_factories.UserFactory()
        self.member_user = users_factories.UserFactory()
        self.viewer_user = users_factories.UserFactory()

        self.owner_client = drf_test.APIClient()
        self.owner_client.force_authenticate(user=self.owner_user)

        self.member_client = drf_test.APIClient()
        self.member_client.force_authenticate(user=self.member_user)

        self.viewer_client = drf_test.APIClient()
        self.viewer_client.force_authenticate(user=self.viewer_user)


@test.override_settings(**TEST_SETTINGS)
class BaseTransactionTestCase(BaseSetupTestCase, drf_test.APITransactionTestCase):
    fixtures = ["roles"]

    def setUp(self) -> None:
        super().setUp()


@test.override_settings(**TEST_SETTINGS)
class BaseTestCase(BaseSetupTestCase, drf_test.APITestCase):
    fixtures = ["roles"]

    def setUp(self) -> None:
        super().setUp()
