from unittest.mock import Mock, patch

from django.utils import timezone
from openai.types.chat import ChatCompletion, ChatCompletionMessage
from openai.types.chat.chat_completion import Choice
from rest_framework.test import APITransactionTestCase

from buddies import models
from buddies.tests import factories


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
        self.assertEqual(models.Buddy.all_objects.first().system_message, "test")
        self.assertEqual(models.Buddy.all_objects.first().model, "gpt-3.5")
        self.assertEqual(models.Buddy.all_objects.first().name, buddy.name)
        self.assertEqual(models.Buddy.all_objects.first().description, buddy.description)
