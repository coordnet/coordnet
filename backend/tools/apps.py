from django.apps import AppConfig


class ToolsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tools"

    def ready(self):
        import tools.signals  # noqa: F401, PLC0415
