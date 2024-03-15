import logging

from celery import shared_task
from django.conf import settings
from django.db import transaction

from nodes import models, utils

logger = logging.getLogger(__name__)


@shared_task(ignore_result=True)
def process_document_events(raise_exception: bool = False) -> None:  # noqa: PLR0915
    """
    Process document events and update the corresponding nodes and projects.
    TODO: Check whether we have an issue with Out of Order Processing.
    TODO: Reduce complexity of this function.
    """
    with transaction.atomic():
        # Lock the rows we are going to process so that no other task will process them.
        events = models.DocumentEvent.objects.select_for_update(skip_locked=True).order_by(
            "created_at"
        )
        for document_event in events:
            logger.debug(f"Processing event {document_event.pk} for {document_event.public_id}")
            try:
                if document_event.document_type == models.DocumentType.EDITOR:
                    # It would be nice to split this into a separate task, but keeping the lock
                    # is a good way to ensure that we don't process the same event twice.
                    if document_event.action in (
                        models.DocumentEvent.EventType.INSERT,
                        models.DocumentEvent.EventType.UPDATE,
                    ):
                        node_text = " ".join(
                            utils.extract_text_from_node(
                                document_event.new_data[settings.NODE_CRDT_KEY]["content"]
                            )
                        )
                        try:
                            node = models.Node.all_objects.select_for_update(no_key=True).get(
                                public_id=document_event.public_id
                            )
                        except models.Node.DoesNotExist:
                            node = models.Node(public_id=document_event.public_id)
                            # TODO: Make fields nullable instead
                            node.title = "Untitled"
                            node.title_token_count = utils.token_count(node.title)

                        node.content = document_event.new_data
                        if node.text != node_text:
                            node.text = node_text
                            node.text_token_count = utils.token_count(node_text)
                        node.save()

                    elif document_event.action == models.DocumentEvent.EventType.DELETE:
                        # We don't actually expect the document to be deleted in the database, they
                        # are just marked as deleted.
                        logger.warning(
                            f"Deletion event for {document_event.public_id} received. ignoring..."
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
                        with transaction.atomic():
                            # 1. Update the project
                            deleted_nodes = (
                                models.Node.all_objects.select_for_update()
                                .filter(
                                    public_id__in=document_event.new_data.get("deletedNodes", [])
                                )
                                .defer("content", "text")
                            )

                            # Extract nodes and titles from project data
                            node_titles = {
                                node_id: node_data.get("title")
                                for node_id, node_data in document_event.new_data.get(
                                    "nodes", {}
                                ).items()
                            }

                            try:
                                project = models.Space.all_objects.select_for_update(
                                    no_key=True
                                ).get(public_id=document_event.public_id)
                            except models.Space.DoesNotExist:
                                logger.error(
                                    f"Project {document_event.public_id} "
                                    "does not exist. Ignoring..."
                                )
                                if raise_exception:
                                    raise
                                continue

                            project.deleted_nodes.set(deleted_nodes)
                            project_nodes = (
                                models.Node.all_objects.select_for_update(no_key=True)
                                .filter(public_id__in=node_titles.keys())
                                .defer("content", "text")
                            )
                            project.nodes.set(project_nodes)

                            # 2. Set the deleted nodes (and undelete if necessary)
                            for deleted_node in deleted_nodes:
                                # Doing this manually for now because I want to keep any signals
                                # that might be triggered.
                                if not deleted_node.is_removed:
                                    deleted_node.delete()

                            # 3. Update the node titles and token counts of existing nodes
                            nodes_in_project = set(node_titles.keys())
                            nodes_existing = set(
                                map(str, project_nodes.values_list("public_id", flat=True))
                            )

                            for node in project_nodes:
                                if node.title != node_titles[str(node.public_id)]:
                                    node.title = node_titles[str(node.public_id)]
                                    node.title_token_count = utils.token_count(node.title)
                                    node.save(update_fields=["title", "title_token_count"])

                            # 4. Create new nodes that didn't get their content synced yet
                            for node_id in nodes_in_project - nodes_existing:
                                # TODO: Change once fields are nullable
                                node = models.Node.objects.create(
                                    public_id=node_id,
                                    title=node_titles[node_id],
                                    title_token_count=utils.token_count(node_titles[node_id]),
                                )
                                project.nodes.add(node)

                    elif document_event.action == models.DocumentEvent.EventType.DELETE:
                        logger.warning(
                            f"Deletion event for {document_event.public_id} received. ignoring..."
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
                        # 1. Update the nodes based on the graph data
                        try:
                            node = models.Node.all_objects.select_for_update(no_key=True).get(
                                public_id=document_event.public_id
                            )
                        except models.Node.DoesNotExist:
                            node = models.Node.objects.create(public_id=document_event.public_id)

                        for node_id in document_event.new_data.get("nodes", []):
                            try:
                                subnode = models.Node.all_objects.select_for_update(
                                    no_key=True
                                ).get(public_id=node_id)
                            except models.Node.DoesNotExist:
                                subnode = models.Node.objects.create(public_id=node_id)
                            node.subnodes.add(subnode)

                    elif document_event.action == models.DocumentEvent.EventType.DELETE:
                        logger.warning(
                            f"Deletion event for {document_event.public_id} received. ignoring..."
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
