from django.urls import reverse
from rest_framework.test import APIRequestFactory

from users.api.views import UserViewSet
from users.tests import factories
from utils.testcases import BaseTransactionTestCase


class TestUserViewSet(BaseTransactionTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.user = factories.UserFactory()
        self.client.force_login(self.user)

    def test_get_queryset(self) -> None:
        view = UserViewSet()
        request = APIRequestFactory().get("/")
        request.user = self.user
        view.request = request
        self.assertIn(self.user, view.get_queryset())

    def test_me(self) -> None:
        response = self.client.get(reverse("auth:user-me"))

        self.assertDictEqual(
            response.data,
            {
                "name": self.user.name,
                "email": self.user.email,
                "id": str(self.user.public_id),
                "profile": self.user.profile.public_id,
            },
        )
