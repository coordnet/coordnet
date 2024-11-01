from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "utils"

    def ready(self) -> None:
        # Import checks to register them, in this case to make sure the OpenAI settings are correct.
        import utils.checks  # noqa: F401
