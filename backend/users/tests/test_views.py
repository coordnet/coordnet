from django.conf import settings
from django.contrib import messages
from django.contrib.auth.models import AnonymousUser
from django.contrib.messages.middleware import MessageMiddleware
from django.contrib.sessions.middleware import SessionMiddleware
from django.http import HttpRequest, HttpResponseRedirect
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from rest_framework.test import APIRequestFactory, APITransactionTestCase

from users.forms import UserAdminChangeForm
from users.tests.factories import UserFactory
from users.views import UserRedirectView, UserUpdateView, user_detail_view
from utils.testcases import BaseTransactionTestCase


class TestUserUpdateView(BaseTransactionTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.user = UserFactory()
        self.request_factory = APIRequestFactory()

    def dummy_get_response(self, request: HttpRequest) -> None:
        return None

    def test_get_success_url(self) -> None:
        view = UserUpdateView()
        request = self.request_factory.get("/fake-url/")
        request.user = self.user

        view.request = request
        assert view.get_success_url() == f"/users/{self.user.pk}/"

    def test_get_object(self) -> None:
        view = UserUpdateView()
        request = self.request_factory.get("/fake-url/")
        request.user = self.user

        view.request = request

        self.assertEqual(view.get_object(), self.user)

    def test_form_valid(self) -> None:
        view = UserUpdateView()
        request = self.request_factory.get("/fake-url/")

        # Add the session/message middleware to the request
        SessionMiddleware(self.dummy_get_response).process_request(request)  # type: ignore[arg-type]
        MessageMiddleware(self.dummy_get_response).process_request(request)  # type: ignore[arg-type]
        request.user = self.user

        view.request = request

        # Initialize the form
        form = UserAdminChangeForm()
        form.cleaned_data = {}
        form.instance = self.user
        view.form_valid(form)

        messages_sent = [m.message for m in messages.get_messages(request)]
        assert messages_sent == [_("Information successfully updated")]


class TestUserRedirectView(APITransactionTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.user = UserFactory()
        self.request_factory = APIRequestFactory()

    def test_get_redirect_url(self) -> None:
        view = UserRedirectView()
        request = self.request_factory.get("/fake-url")
        request.user = self.user

        view.request = request
        assert view.get_redirect_url() == f"/users/{self.user.pk}/"


class TestUserDetailView(APITransactionTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.user = UserFactory()
        self.request_factory = APIRequestFactory()

    def test_authenticated(self) -> None:
        request = self.request_factory.get("/fake-url/")
        request.user = UserFactory()
        response = user_detail_view(request, pk=self.user.pk)

        assert response.status_code == 200

    def test_not_authenticated(self) -> None:
        request = self.request_factory.get("/fake-url/")
        request.user = AnonymousUser()
        response = user_detail_view(request, pk=self.user.pk)
        login_url = reverse(settings.LOGIN_URL)

        assert isinstance(response, HttpResponseRedirect)
        assert response.status_code == 302
        assert response.url == f"{login_url}?next=/fake-url/"
