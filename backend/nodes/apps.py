from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "nodes"

    def ready(self) -> None:
        from django.conf import settings
        from django_celery_beat.models import IntervalSchedule, PeriodicTask

        # Create a schedule for the node event scanning task
        schedule, created = IntervalSchedule.objects.get_or_create(
            every=settings.NODE_CRDT_EVENTS_INTERVAL,
            period=IntervalSchedule.SECONDS,
        )

        # Associate this schedule with your task
        PeriodicTask.objects.update_or_create(
            task=settings.NODE_CRDT_EVENTS_TASK,
            defaults={
                "interval": schedule,
                "name": f"Scan document events every {settings.NODE_CRDT_EVENTS_INTERVAL} seconds",
            },
        )

        # Create a schedule for the document versioning task
        schedule, created = IntervalSchedule.objects.get_or_create(
            every=settings.NODE_VERSIONING_TASK_INTERVAL,
            period=IntervalSchedule.SECONDS,
        )

        # Associate this schedule with your task
        PeriodicTask.objects.update_or_create(
            task=settings.NODE_VERSIONING_TASK,
            defaults={
                "interval": schedule,
                "name": f"Snapshot documents every {settings.NODE_VERSIONING_TASK_INTERVAL} "
                f"seconds (snapshot interval is {settings.NODE_VERSIONING_INTERVAL}).",
            },
        )

        # Import task here to avoid AppRegistryNotReady exception
        import nodes.signals
        import nodes.tasks  # noqa: F401
