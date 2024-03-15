from django.test import TestCase

from nodes import models
from nodes.tests import factories


class NodeModelTestCase(TestCase):
    def test_node_creation_and_deletion(self) -> None:
        # TODO: Start using factories for creating test data.
        node = factories.NodeFactory.create(title="test")
        self.assertEqual(node.title, "test")

        node.delete()
        self.assertEqual(models.Node.available_objects.count(), 0)
        self.assertEqual(models.Node.all_objects.count(), 1)
        self.assertTrue(models.Node.all_objects.first().is_removed)

    def test_node_related_model_manager(self) -> None:
        node_1 = factories.NodeFactory.create(title="test")
        node_1.delete()
        node_2 = factories.NodeFactory.create(title="test")
        node_2.subnodes.add(node_1)

        self.assertEqual(node_2.subnodes.count(), 0)

    def test_spaces_with_same_titles(self) -> None:
        space_1 = models.Space.objects.create(title="test")
        space_2 = models.Space.objects.create(title="test")

        self.assertNotEqual(space_1.title_slug, space_2.title_slug)
