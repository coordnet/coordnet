import typing

from celery import signals
from django.conf import settings
from django.db import close_old_connections
from django_celery_beat.models import IntervalSchedule, PeriodicTask


@signals.after_setup_task_logger.connect
def create_periodic_tasks(sender: typing.Any, **kwargs: typing.Any) -> None:
    # Create a schedule for the node event scanning task
    schedule, created = IntervalSchedule.objects.get_or_create(
        every=settings.NODE_CRDT_EVENTS_INTERVAL, period=IntervalSchedule.SECONDS
    )

    # Associate this schedule with the task
    PeriodicTask.objects.update_or_create(
        task=settings.NODE_CRDT_EVENTS_TASK,
        defaults={
            "interval": schedule,
            "name": f"Scan document events every {settings.NODE_CRDT_EVENTS_INTERVAL} seconds",
        },
    )

    # Create a schedule for the document versioning task
    try:
        schedule, created = IntervalSchedule.objects.get_or_create(
            every=settings.NODE_VERSIONING_TASK_INTERVAL, period=IntervalSchedule.SECONDS
        )
    except IntervalSchedule.MultipleObjectsReturned:
        schedule = IntervalSchedule.objects.filter(
            every=settings.NODE_VERSIONING_TASK_INTERVAL, period=IntervalSchedule.SECONDS
        ).first()

    # Associate this schedule with the task
    PeriodicTask.objects.update_or_create(
        task=settings.NODE_VERSIONING_TASK,
        defaults={
            "interval": schedule,
            "name": f"Snapshot documents every {settings.NODE_VERSIONING_TASK_INTERVAL} "
            f"seconds (snapshot interval is {settings.NODE_VERSIONING_INTERVAL}).",
        },
    )


# TODO: This should probably live in another place, not in a specific app.
@signals.task_postrun.connect
def close_old_database_connections(sender: typing.Any, **kwargs: typing.Any) -> None:
    close_old_connections()
