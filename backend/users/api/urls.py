import knox.views as knox_views
from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token

from users.api import views
from utils import routers

app_name = "auth"
router = routers.get_router()

router.register("users", views.UserViewSet, basename="user")


urlpatterns = router.urls + [
    path("auth/register/", view=views.RegisterAPIView.as_view(), name="register"),
    path("auth/delete-user/", view=views.DeleteUserAPIView.as_view(), name="delete_user"),
    path("auth/login/", views.LoginView.as_view(), name="knox_login"),
    path("auth/logout/", knox_views.LogoutView.as_view(), name="knox_logout"),
    path("auth/logoutall/", knox_views.LogoutAllView.as_view(), name="knox_logoutall"),
    path("auth/verify/", views.VerifyEmailView.as_view(), name="password_verify"),
    path("auth/token/", obtain_auth_token),
    path(
        "auth/password-reset/",
        include("django_rest_passwordreset.urls", namespace="password_reset"),
    ),
    path(
        "auth/change-password/",
        views.PasswordChangeView.as_view(),
        name="knox_password_change",
    ),
]
