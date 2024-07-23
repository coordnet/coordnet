import logging
import selectors
import signal
import sys
import types
import typing

import psycopg
from django.core.management import BaseCommand
from django.db import connections

import nodes.models
import nodes.tasks

logger = logging.getLogger(__name__)


def signal_handler(sig: int, frame: types.FrameType | None) -> None:
    logger.info("Shutting down...")
    sys.exit(0)


# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


class Command(BaseCommand):
    help = "Listen for changes in the document table"

    def handle(self, *args: typing.Any, **options: typing.Any) -> None:
        if "direct" in connections:
            connection = connections["direct"]
            logger.info("Using direct connection")
        else:
            connection = connections["default"]
            logger.error("Using default connection instead of direct connection")
        with connection.cursor() as curs:
            conn = curs.connection
            curs.execute(f"LISTEN {nodes.models.PG_NOTIFY_CHANNEL};")
            self.stdout.write(self.style.SUCCESS("Listening for notifications..."))

            sel = selectors.DefaultSelector()
            sel.register(conn, selectors.EVENT_READ)
            while True:
                if not sel.select(timeout=60.0):
                    continue  # No FD activity detected in one minute

                # Activity detected. Is the connection still ok?
                try:
                    conn.execute("SELECT 1")
                except psycopg.OperationalError:
                    # You were disconnected: do something useful such as panicking
                    self.stdout.write(
                        self.style.WARNING("We lost our database connection! Shutting down...")
                    )
                    sys.exit(1)

                for notify in conn.notifies():
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"NOTIFY received: {notify.pid}, {notify.channel}, {notify.payload}"
                        )
                    )
                    nodes.tasks.process_document_events.delay()
