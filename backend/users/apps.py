from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class UsersConfig(AppConfig):
    name = "users"
    verbose_name = _("Users")

    def ready(self) -> None:
        try:
            import users.signals  # noqa: F401, PLC0415
        except ImportError:
            pass
