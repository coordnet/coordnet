import typing

from celery import signals
from django_celery_beat.models import IntervalSchedule, PeriodicTask


@signals.after_setup_task_logger.connect
def create_periodic_tasks(sender: typing.Any, **kwargs: typing.Any) -> None:
    # Create a schedule for the permission cleanup task
    schedule, created = IntervalSchedule.objects.get_or_create(
        every=6, period=IntervalSchedule.HOURS
    )

    # Associate this schedule with the task
    PeriodicTask.objects.update_or_create(
        task="permissions.tasks.cleanup_permissions",
        defaults={
            "interval": schedule,
            "name": "Clean up permissions every 6 hours.",
        },
    )
