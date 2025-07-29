from django.apps import AppConfig


class BuddiesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "buddies"

    def ready(self) -> None:
        import buddies.signals  # noqa: PLC0415
        import buddies.tasks  # noqa: F401, PLC0415
