from django.test import SimpleTestCase

from nodes import utils
from nodes.tests.fixtures import EDITOR_WITH_NODES


class NodeExtractionTestCase(SimpleTestCase):
    # def test_extract_nodes_from_json(self) -> None:
    #     """Test that nodes are extracted from a JSON object."""
    #
    #     # If the JSON object is a document, the function should return a list of nodes, including
    #     # the document itself.
    #     nodes = utils.extract_nodes_from_json(DOC_WITHOUT_NODES, "test")
    #     self.assertEqual(len(nodes), 1)
    #
    #     # If there are sub-nodes in the JSON object, the function should return them as well.
    #     nodes = utils.extract_nodes_from_json(DOC_WITH_NODES, "test")
    #     self.assertEqual(len(nodes), 2)
    #     self.assertEqual(nodes[0]["name"], "test")
    #     self.assertEqual(nodes[0]["type"], "document")
    #     self.assertEqual(nodes[0]["content"], DOC_WITH_NODES["default"])
    #
    # def test_extract_coord_nodes(self) -> None:
    #     """Test that nodes are extracted from a JSON object."""
    #     nodes = utils.extract_coord_nodes(DOC_WITH_NODES["default"])
    #     self.assertEqual(len(nodes), 1)
    #     self.assertEqual(nodes[0]["name"], "ee11e624-9439-4e21-9bd1-e6ac016f7f3a")
    #     self.assertEqual(nodes[0]["type"], "node")
    #     self.assertEqual(nodes[0]["content"], DOC_WITH_NODES["default"]["content"][2])
    #
    # def test_extract_coord_nodes_from_space(self) -> None:
    #     """Test that no nodes are extracted from a space."""
    #     nodes = utils.extract_nodes_from_json(SPACE, "test")
    #     self.assertEqual(len(nodes), 0)
    #
    # def test_extract_coord_nodes_from_graph(self) -> None:
    #     """Test that no nodes are extracted from a graph."""
    #     nodes = utils.extract_nodes_from_json(GRAPH, "test")
    #     self.assertEqual(len(nodes), 0)

    def test_extract_text_from_node(self) -> None:
        """Test that text is extracted from a node."""
        text = utils.extract_text_from_node(EDITOR_WITH_NODES["default"])
        self.assertListEqual(text, ["Test", "Test", "Hey"])
