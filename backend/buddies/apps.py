from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "buddies"

    def ready(self) -> None:
        import buddies.signals
        import buddies.tasks  # noqa: F401
