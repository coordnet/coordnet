from itertools import chain

from nodes import models
from nodes.tests import factories
from utils.testcases import BaseTestCase


class NodeModelTestCase(BaseTestCase):
    def test_node_creation_and_deletion(self) -> None:
        node = factories.NodeFactory.create(title="test")
        self.assertEqual(node.title, "test")

        node.delete()
        self.assertEqual(models.Node.available_objects.count(), 0)
        self.assertEqual(models.Node.all_objects.count(), 1)
        self.assertTrue(models.Node.all_objects.all()[0].is_removed)

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

    def test_node_token_calculation(self) -> None:
        node = factories.NodeFactory.create(title="test", text="test")
        node.refresh_from_db()
        self.assertEqual(node.title_token_count, 1)
        self.assertEqual(node.text_token_count, 1)

        node.title = "test test"
        node.save()
        node.refresh_from_db()
        self.assertEqual(node.title_token_count, 2)

        node.content = factories.content_for_text("test test")
        node.save(update_fields=["content"])
        node.refresh_from_db()
        self.assertEqual(node.text_token_count, 2)

    def test_subnode_fetching(self) -> None:
        """Test that subnodes are fetched by depth."""
        third_level_subnodes = [factories.NodeFactory.create_batch(3) for _ in range(3)]
        second_level_subnodes = factories.NodeFactory.create_batch(3)
        for idx, node in enumerate(second_level_subnodes):
            node.subnodes.add(*third_level_subnodes[idx])
        node = factories.NodeFactory()
        node.subnodes.add(*second_level_subnodes)

        with self.assertNumQueries(4):
            nodes_at_depth = node.fetch_subnodes(2)
            self.assertEqual(len(nodes_at_depth[0]), 1)
            self.assertEqual(len(nodes_at_depth[1]), 3)
            self.assertEqual(len(nodes_at_depth[2]), 9)
            self.assertNotIn(3, nodes_at_depth)

    def test_node_as_str(self) -> None:
        node = factories.NodeFactory.create(title="test", text="test text")
        self.assertEqual(
            node.node_as_str(include_content=False, include_connections=True),
            f"({node.public_id})\n - Title: test",
        )
        self.assertEqual(
            node.node_as_str(include_content=True, include_connections=True),
            f"({node.public_id})\n - Title: test\n - Content: test text",
        )

        subnode = factories.NodeFactory.create(title="subnode")
        node.subnodes.add(subnode)
        self.assertEqual(
            node.node_as_str(include_content=False, include_connections=True),
            f"({node.public_id})\n - Title: test\n - Connects to: {subnode.public_id}",
        )
        self.assertEqual(
            node.node_as_str(include_content=True, include_connections=True),
            f"({node.public_id})\n - Title: test\n - Content: test text"
            f"\n - Connects to: {subnode.public_id}",
        )
        self.assertEqual(
            node.node_as_str(include_content=False, include_connections=False),
            f"({node.public_id})\n - Title: test",
        )
        self.assertEqual(
            node.node_as_str(include_content=True, include_connections=False),
            f"({node.public_id})\n - Title: test\n - Content: test text",
        )

    def test_node_context_for_depth(self) -> None:
        # TODO: To improve this test, make sure that all content is unique.
        third_level_subnodes = [factories.NodeFactory.create_batch(3) for _ in range(3)]
        second_level_subnodes = factories.NodeFactory.create_batch(3)
        for idx, node in enumerate(second_level_subnodes):
            node.subnodes.add(*third_level_subnodes[idx])
        node = factories.NodeFactory()
        node.subnodes.add(*second_level_subnodes)

        context = node.node_context_for_depth(0)
        self.assertIn(
            node.node_as_str(include_content=True, include_connections=False) + "\n", context
        )
        for subnode in second_level_subnodes:
            self.assertIn(subnode.title.replace("\n", " "), context)
            self.assertNotIn(subnode.text.replace("\n", " "), context)
        for subnode in chain(*third_level_subnodes):
            self.assertNotIn(subnode.title.replace("\n", " "), context)
            self.assertNotIn(subnode.text.replace("\n", " "), context)

        context = node.node_context_for_depth(1)
        self.assertIn(
            node.node_as_str(include_content=True, include_connections=False) + "\n", context
        )

        for subnode in second_level_subnodes:
            self.assertIn(subnode.title.replace("\n", " "), context)
            self.assertIn(subnode.text.replace("\n", " "), context)
        for subnode in chain(*third_level_subnodes):
            self.assertNotIn(subnode.title.replace("\n", " "), context)
            self.assertNotIn(subnode.text.replace("\n", " "), context)

        context = node.node_context_for_depth(2)
        self.assertIn(
            node.node_as_str(include_content=True, include_connections=False) + "\n", context
        )
        for subnode in second_level_subnodes:
            self.assertIn(subnode.title.replace("\n", " "), context)
            self.assertIn(subnode.text.replace("\n", " "), context)
        for subnode in chain(*third_level_subnodes):
            self.assertIn(subnode.title.replace("\n", " "), context)
            self.assertNotIn(subnode.text.replace("\n", " "), context)

        context = node.node_context_for_depth(3)
        self.assertIn(
            node.node_as_str(include_content=True, include_connections=False) + "\n", context
        )
        for subnode in second_level_subnodes:
            self.assertIn(subnode.title.replace("\n", " "), context)
            self.assertIn(subnode.text.replace("\n", " "), context)
        for subnode in chain(*third_level_subnodes):
            self.assertIn(subnode.title.replace("\n", " "), context)
            self.assertIn(subnode.text.replace("\n", " "), context)

    def test_node_context_with_duplicate_subnodes(self) -> None:
        """Regression test to ensure that subnodes are not duplicated in the context."""
        third_level_subnode = factories.NodeFactory.create()
        second_level_subnodes = factories.NodeFactory.create_batch(2)
        for node in second_level_subnodes:
            node.subnodes.add(third_level_subnode)
        node = factories.NodeFactory()

        # Only add one second-level subnode for now.
        node.subnodes.add(second_level_subnodes[0])

        context = node.node_context_for_depth(2)
        # The third-level subnode should only appear twice, once for the connection and once to
        # specify its content.
        self.assertEqual(context.count(str(third_level_subnode.public_id)), 2)

        # Add the second second-level subnode.
        node.subnodes.add(second_level_subnodes[1])
        context = node.node_context_for_depth(2)
        # The third-level subnode should only appear three times, twice for the connections and once
        # to specify its content.
        self.assertEqual(context.count(str(third_level_subnode.public_id)), 3)
