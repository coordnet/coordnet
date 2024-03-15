from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "nodes"

    def ready(self) -> None:
        # Import task here to avoid AppRegistryNotReady exception
        import nodes.signals
        import nodes.tasks  # noqa: F401
