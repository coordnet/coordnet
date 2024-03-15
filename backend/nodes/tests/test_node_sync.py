import uuid

from django.test import TransactionTestCase

from nodes import models, tasks
from nodes.tests import factories, fixtures


class NodeEventTestCase(TransactionTestCase):
    def test_document_trigger(self) -> None:
        """Test that a document event is triggered."""
        self.assertEqual(models.DocumentEvent.objects.count(), 0)

        public_id = str(uuid.uuid4())
        factories.DocumentFactory.create(
            public_id=public_id, document_type=models.DocumentType.EDITOR, json={}
        )

        self.assertEqual(models.DocumentEvent.objects.count(), 1)

    def test_node_create(self) -> None:
        """Test that a new node is created."""
        self.assertEqual(models.Node.all_objects.count(), 0)
        self.assertEqual(models.DocumentEvent.objects.count(), 0)

        public_id = str(uuid.uuid4())

        # TODO: Improve the way that the document event is created and task is triggered.
        factories.DocumentEventFactory.create(
            public_id=public_id,
            action="INSERT",
            new_data=fixtures.EDITOR_WITHOUT_NODES,
            document_type=models.DocumentType.EDITOR,
        )

        tasks.process_document_events(raise_exception=True)

        self.assertEqual(models.Node.all_objects.count(), 1)
        self.assertEqual(models.DocumentEvent.objects.count(), 0)

    def test_project_create(self) -> None:
        """Test that a new project is created."""
        self.assertEqual(models.Space.objects.count(), 0)
        self.assertEqual(models.DocumentEvent.objects.count(), 0)

        public_id = str(uuid.uuid4())

        # TODO: Improve the way that the document event is created and task is triggered.
        factories.DocumentEventFactory.create(
            public_id=public_id,
            action="INSERT",
            new_data=fixtures.SPACE,
            document_type=models.DocumentType.SPACE,
        )

        with self.assertRaises(models.Space.DoesNotExist):
            tasks.process_document_events(raise_exception=True)

        factories.SpaceFactory.create(public_id=public_id)

        tasks.process_document_events(raise_exception=True)

        self.assertEqual(models.Space.objects.count(), 1)
        self.assertEqual(models.DocumentEvent.objects.count(), 0)
        self.assertEqual(models.Node.objects.count(), 4)

    def test_graph_create(self) -> None:
        """Test that a new graph is created."""
        self.assertEqual(models.Node.all_objects.count(), 0)
        self.assertEqual(models.DocumentEvent.objects.count(), 0)

        node = factories.NodeFactory.create()

        # TODO: Improve the way that the document event is created and task is triggered.
        factories.DocumentEventFactory.create(
            public_id=node.public_id,
            action="INSERT",
            new_data=fixtures.GRAPH,
            document_type=models.DocumentType.GRAPH,
        )

        tasks.process_document_events(raise_exception=True)

        self.assertEqual(models.Node.all_objects.count(), 2)
        self.assertEqual(models.DocumentEvent.objects.count(), 0)

    def test_graph_and_node_create(self) -> None:
        """Test that a new graph is created."""
        self.assertEqual(models.Node.all_objects.count(), 0)
        self.assertEqual(models.DocumentEvent.objects.count(), 0)

        public_id = str(uuid.uuid4())

        factories.DocumentEventFactory.create(
            public_id=public_id,
            action="INSERT",
            new_data=fixtures.EDITOR_WITH_NODES,
            document_type=models.DocumentType.EDITOR,
        )

        factories.DocumentEventFactory.create(
            public_id=list(fixtures.GRAPH["nodes"].keys())[0],
            action="INSERT",
            new_data=fixtures.EDITOR_WITH_NODES,
            document_type=models.DocumentType.EDITOR,
        )

        # TODO: Improve the way that the document event is created and task is triggered.
        factories.DocumentEventFactory.create(
            public_id=public_id,
            action="INSERT",
            new_data=fixtures.GRAPH,
            document_type=models.DocumentType.GRAPH,
        )

        tasks.process_document_events(raise_exception=True)

        self.assertEqual(models.Node.all_objects.count(), 2)
        self.assertEqual(models.DocumentEvent.objects.count(), 0)

    def test_space_update_and_existing_nodes(self) -> None:
        self.assertEqual(models.Space.objects.count(), 0)
        self.assertEqual(models.DocumentEvent.objects.count(), 0)
        self.assertEqual(models.Node.objects.count(), 0)

        space_public_id = str(uuid.uuid4())
        factories.SpaceFactory.create(public_id=space_public_id)

        for key in fixtures.SPACE["nodes"]:
            factories.NodeFactory.create(public_id=key)

        # TODO: Improve the way that the document event is created and task is triggered.
        factories.DocumentEventFactory.create(
            public_id=space_public_id,
            action="INSERT",
            new_data=fixtures.SPACE,
            document_type=models.DocumentType.SPACE,
        )

        tasks.process_document_events(raise_exception=True)

        factories.DocumentEventFactory.create(
            public_id=space_public_id,
            action="INSERT",
            new_data=fixtures.SPACE,
            document_type=models.DocumentType.SPACE,
        )

        tasks.process_document_events(raise_exception=True)

        self.assertEqual(models.Space.objects.count(), 1)
        self.assertEqual(models.DocumentEvent.objects.count(), 0)
        self.assertEqual(models.Node.objects.count(), 4)
