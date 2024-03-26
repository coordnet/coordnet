from django.test import SimpleTestCase

from nodes import utils
from nodes.tests import fixtures


class NodeExtractionTestCase(SimpleTestCase):
    def test_extract_text_from_node(self) -> None:
        """Test that text is extracted from a node."""
        text = utils.extract_text_from_node(fixtures.EDITOR_WITH_NODES["default"])
        self.assertListEqual(text, ["Test", "Test", "Hey"])
