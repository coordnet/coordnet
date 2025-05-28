from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "utils"

    def ready(self) -> None:
        # Import the storage_checks module to register the storage configuration check
        import utils.storage_checks  # noqa: F401
