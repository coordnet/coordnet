from unittest.mock import Mock, patch

from django.utils import timezone
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from openai.types.chat.chat_completion import Choice
from rest_framework.test import APITransactionTestCase

from buddies import models
from buddies.tests import factories
from nodes.tests import factories as node_factories


def create_chat_completion(response: str, role: str = "assistant") -> ChatCompletion:
    return ChatCompletion(
        id="foo",
        model="gpt-3.5-turbo",
        object="chat.completion",
        choices=[
            Choice(
                finish_reason="stop",
                index=0,
                message=ChatCompletionMessage(
                    content=response,
                    role=role,  # type: ignore[arg-type]
                ),
            )
        ],
        created=int(timezone.now().timestamp()),
    )


class BuddyTestCase(APITransactionTestCase):
    # TODO: Improve and add tests, try to remove type ignores
    @patch("openai.resources.chat.Completions.create")
    def test_buddy_query_model(self, openai_create: Mock) -> None:
        EXPECTED_RESPONSE = "The mock is working! ;)"
        openai_create.return_value = create_chat_completion(EXPECTED_RESPONSE)

        buddy = factories.BuddyFactory.create(system_message="test")
        self.assertEqual(models.Buddy.available_objects.count(), 1)
        self.assertEqual(models.Buddy.all_objects.count(), 1)
        self.assertFalse(models.Buddy.all_objects.first().is_removed)
        self.assertEqual(models.Buddy.all_objects.first().system_message, buddy.system_message)
        self.assertEqual(models.Buddy.all_objects.first().model, buddy.model)
        self.assertEqual(models.Buddy.all_objects.first().name, buddy.name)
        self.assertEqual(models.Buddy.all_objects.first().description, buddy.description)

    def test_single_node_token_calculation(self) -> None:
        """Regression test to make sure that the cut-off level for token calculations is correct."""
        buddy = factories.BuddyFactory()
        node = node_factories.NodeFactory()

        token_counts = buddy.calculate_token_counts([node], 1, "test")
        self.assertIn(0, token_counts)
        self.assertNotIn(1, token_counts)
        self.assertNotIn(-1, token_counts)
