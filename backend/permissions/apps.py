from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "permissions"

    def ready(self) -> None:
        import permissions.signals
        import permissions.tasks  # noqa: F401
