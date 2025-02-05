import logging
from datetime import timedelta
from hashlib import sha256

import pglock
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from nodes import models

logger = logging.getLogger(__name__)


@shared_task(ignore_result=True, expires=10)
def process_document_events(raise_exception: bool = False) -> None:  # noqa: PLR0915, PLR0912
    """
    Process document events and update the corresponding Nodes and Spaces.
    TODO: Check whether we have an issue with Out of Order Processing.
    TODO: Reduce complexity of this function.
    """

    # The pglock.advisory context manager is used to ensure that only one task is running at a time.
    with pglock.advisory("process_document_events_task", xact=True):
        # Lock the rows we are going to process so that no other task will process them.
        events = models.DocumentEvent.objects.select_for_update(skip_locked=True).order_by(
            "created_at"
        )
        for document_event in events:
            logger.debug(f"Processing event {document_event.pk} for {document_event.public_id}")
            try:
                with transaction.atomic():
                    if document_event.document_type == models.DocumentType.EDITOR:
                        # It would be nice to split this into a separate task, but keeping the
                        # lock is a good way to ensure that we don't process the same event
                        # twice.
                        if document_event.action in (
                            models.DocumentEvent.EventType.INSERT,
                            models.DocumentEvent.EventType.UPDATE,
                        ):
                            # Fetch the node, or create it.
                            try:
                                node = models.Node.all_objects.select_for_update(no_key=True).get(
                                    public_id=document_event.public_id
                                )
                            except models.Node.DoesNotExist:
                                node = models.Node(
                                    public_id=document_event.public_id,
                                    node_type=models.NodeType.DEFAULT,
                                )

                            # Try setting the graph and editor documents.
                            if not node.graph_document:
                                try:
                                    node.graph_document = models.Document.objects.only("id").get(
                                        public_id=document_event.public_id,
                                        document_type=models.DocumentType.GRAPH,
                                    )
                                except models.Document.DoesNotExist:
                                    pass

                            if not node.editor_document:
                                try:
                                    node.editor_document = models.Document.objects.only("id").get(
                                        public_id=document_event.public_id,
                                        document_type=models.DocumentType.EDITOR,
                                    )
                                except models.Document.DoesNotExist:
                                    pass

                            node.content = document_event.new_data
                            node.save()

                        elif document_event.action == models.DocumentEvent.EventType.DELETE:
                            # We don't actually expect the document to be deleted in the
                            # database, they are just marked as deleted.
                            logger.warning(
                                f"Deletion event for {document_event.public_id} received. "
                                "Ignoring..."
                            )
                        else:
                            logger.warning(
                                f"Unknown action {document_event.action} for "
                                f"{document_event.public_id} received. ignoring..."
                            )
                    elif document_event.document_type == models.DocumentType.SPACE:
                        if document_event.action in (
                            models.DocumentEvent.EventType.INSERT,
                            models.DocumentEvent.EventType.UPDATE,
                        ):
                            if not document_event.new_data:
                                logger.error(
                                    f"Space Event {document_event.public_id} has no data. "
                                    "Ignoring..."
                                )
                                continue
                            # 1. Update the space

                            # Extract nodes and titles from space data
                            node_titles = {
                                node_id: node_data.get("title")
                                for node_id, node_data in document_event.new_data.get(
                                    "nodes", {}
                                ).items()
                            }

                            try:
                                space = models.Space.all_objects.select_for_update(no_key=True).get(
                                    public_id=document_event.public_id
                                )
                            except models.Space.DoesNotExist:
                                logger.error(
                                    f"Space {document_event.public_id} does not exist. "
                                    "Ignoring..."
                                )
                                if raise_exception:
                                    raise
                                continue

                            if not space.document:
                                try:
                                    space.document = models.Document.objects.only("id").get(
                                        public_id=document_event.public_id
                                    )
                                except models.Document.DoesNotExist:
                                    pass
                                else:
                                    space.save(update_fields=["document"])

                            space_nodes = (
                                models.Node.all_objects.select_for_update(no_key=True)
                                .filter(public_id__in=node_titles.keys())
                                .defer("content", "text")
                                .order_by("-created_at")
                            )
                            space.nodes.set(space_nodes)

                            # 2. Update the node titles and token counts of existing nodes
                            nodes_in_space = set(node_titles.keys())
                            nodes_existing = set(
                                map(str, space_nodes.values_list("public_id", flat=True))
                            )

                            for node in space_nodes:
                                if node.title != node_titles[str(node.public_id)]:
                                    node.title = node_titles[str(node.public_id)]
                                    node.save(update_fields=["title"])

                            # 3. Create new nodes that didn't get their content synced yet
                            for node_id in nodes_in_space - nodes_existing:
                                node = models.Node(
                                    public_id=node_id,
                                    title=node_titles[node_id],
                                    space=space,
                                    node_type=models.NodeType.DEFAULT,
                                )

                                # This is in case the node was synced meanwhile.
                                try:
                                    node.graph_document = models.Document.objects.only("id").get(
                                        public_id=document_event.public_id,
                                        document_type=models.DocumentType.GRAPH,
                                    )
                                except models.Document.DoesNotExist:
                                    pass

                                try:
                                    node.editor_document = models.Document.objects.only("id").get(
                                        public_id=document_event.public_id,
                                        document_type=models.DocumentType.EDITOR,
                                    )
                                except models.Document.DoesNotExist:
                                    pass

                                node.save()

                        elif document_event.action == models.DocumentEvent.EventType.DELETE:
                            logger.warning(
                                f"Deletion event for {document_event.public_id} received. "
                                "Ignoring..."
                            )
                        else:
                            logger.warning(
                                f"Unknown action {document_event.action} for "
                                f"{document_event.public_id} received. ignoring..."
                            )

                    elif document_event.document_type == models.DocumentType.GRAPH:
                        if document_event.action in (
                            models.DocumentEvent.EventType.INSERT,
                            models.DocumentEvent.EventType.UPDATE,
                        ):
                            if not document_event.new_data:
                                logger.error(
                                    f"Graph Event {document_event.public_id} has no data. "
                                    "Ignoring..."
                                )
                                continue

                            # 1. Get or create the parent node
                            try:
                                node = models.Node.all_objects.select_for_update(no_key=True).get(
                                    public_id=document_event.public_id
                                )
                            except models.Node.DoesNotExist:
                                node = models.Node.objects.create(
                                    public_id=document_event.public_id,
                                    node_type=models.NodeType.DEFAULT,
                                )

                            if not node.graph_document:
                                try:
                                    node.graph_document = models.Document.objects.only("id").get(
                                        public_id=document_event.public_id,
                                        document_type=models.DocumentType.GRAPH,
                                    )
                                except models.Document.DoesNotExist:
                                    pass
                                else:
                                    # TODO: Remove duplicate save
                                    node.save(update_fields=["graph_document"])

                            # 2. Set subnodes

                            for node_id in document_event.new_data.get("nodes", []):
                                try:
                                    subnode = models.Node.all_objects.select_for_update(
                                        no_key=True
                                    ).get(public_id=node_id)
                                except models.Node.DoesNotExist:
                                    subnode = models.Node.objects.create(
                                        public_id=node_id, node_type=models.NodeType.DEFAULT
                                    )
                                node.subnodes.add(subnode)

                        elif document_event.action == models.DocumentEvent.EventType.DELETE:
                            logger.warning(
                                f"Deletion event for {document_event.public_id} received. "
                                "Ignoring..."
                            )
                        else:
                            logger.warning(
                                f"Unknown action {document_event.action} for "
                                f"{document_event.public_id} received. ignoring..."
                            )
                    elif document_event.document_type == models.DocumentType.METHOD_GRAPH:
                        if document_event.action in (
                            models.DocumentEvent.EventType.INSERT,
                            models.DocumentEvent.EventType.UPDATE,
                        ):
                            # 1. Get or create the parent node
                            try:
                                node = models.Node.all_objects.select_for_update(no_key=True).get(
                                    public_id=document_event.public_id
                                )
                            except models.Node.DoesNotExist:
                                node = models.Node.objects.create(
                                    public_id=document_event.public_id,
                                    node_type=models.NodeType.METHOD,
                                )

                            if not node.graph_document:
                                try:
                                    node.graph_document = models.Document.objects.only("id").get(
                                        public_id=document_event.public_id,
                                        document_type=models.DocumentType.METHOD_GRAPH,
                                    )
                                except models.Document.DoesNotExist:
                                    pass
                                else:
                                    # TODO: Remove duplicate save
                                    node.save(update_fields=["graph_document"])

                        elif document_event.action == models.DocumentEvent.EventType.DELETE:
                            logger.warning(
                                f"Deletion event for {document_event.public_id} received. "
                                "Ignoring..."
                            )
                        else:
                            logger.warning(
                                f"Unknown action {document_event.action} for "
                                f"{document_event.public_id} received. ignoring..."
                            )
            except Exception as e:
                logger.exception(f"Error processing event {document_event.pk}: {e}")
                if raise_exception:
                    raise
                continue
            finally:
                document_event.delete()


@shared_task(ignore_result=True, expires=settings.NODE_VERSIONING_INTERVAL * 5)
def document_versioning() -> None:
    """
    Save a snapshot of all documents if they were changed within the last interval.
    """

    now = timezone.now()
    threshold_time = now - timedelta(seconds=settings.NODE_VERSIONING_INTERVAL)
    lower_threshold_time = threshold_time - timedelta(days=1)

    # Fetch document versions that were created outside the current interval. Doing the query this
    # way around means we have to do another one for documents without versions, but this is by
    # far the fastest query I could find.
    # TODO: Still add fitting indices for this query to the database. The number of DocumentVersion
    #       objects will grow very fast.
    # TODO: Consider using a different approach where we calculate the sha256 hash of the document
    #       and compare it to the hash stored in the database. This would be faster, but we would
    #       have to store the hash in the database and calculate it on every save.
    # Note: We added a lower threshold time to the query to avoid fetching documents checking
    #       documents that weren't update recently. This became necessary because the query was
    #       taking too long to execute. However this will cause problems if the task is not run
    #       for a long time.
    latest_versions = (
        models.DocumentVersion.available_objects.order_by("document_id", "-created_at")
        .distinct("document_id")
        .select_related("document")
        .filter(
            document__updated_at__lt=threshold_time, document__updated_at__gt=lower_threshold_time
        )
        .only("document__document_type", "document__data", "document__json", "json_hash")
    )

    for version in latest_versions:
        document_hash = sha256(str(version.document.json).encode()).hexdigest()
        if version.json_hash != document_hash:
            version.document.versions.create(
                data=version.document.data,
                json_hash=document_hash,
                document_type=version.document.document_type,
            )

    # Fetch documents without versions and create a version for them
    for document in models.Document.objects.filter(versions__isnull=True):
        document.versions.create(
            data=document.data,
            json_hash=sha256(str(document.json).encode()).hexdigest(),
            document_type=document.document_type,
        )
