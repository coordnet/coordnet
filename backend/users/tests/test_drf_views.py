from django.urls import reverse
from rest_framework.test import APIRequestFactory, APITransactionTestCase

from users.api.views import UserViewSet
from users.tests import factories


class TestUserViewSet(APITransactionTestCase):
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
        request = APIRequestFactory().get("/")
        absolute_url = request.build_absolute_uri(
            reverse("auth:user-detail", kwargs={"public_id": self.user.public_id})
        )

        self.assertDictEqual(
            response.data,
            {
                "name": self.user.name,
                "email": self.user.email,
                "id": str(self.user.public_id),
                "url": absolute_url,
            },
        )
