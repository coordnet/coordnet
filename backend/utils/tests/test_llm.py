from django.core.management import call_command
from django.core.management.base import SystemCheckError
from django.test import SimpleTestCase, override_settings


class LLMTestCase(SimpleTestCase):
    @override_settings(OPENAI_API_KEY=None)
    def test_no_key_set(self) -> None:
        message = (
            "(OpenAI.E001) Either OPENAI_API_KEY or AZURE_OPENAI_API_KEY and "
            "AZURE_OPENAI_ENDPOINT need to be provided."
        )
        with self.assertRaisesMessage(SystemCheckError, message):
            call_command("check")

    @override_settings(
        OPENAI_API_KEY="sk-test-123", AZURE_OPENAI_API_KEY=None, AZURE_OPENAI_ENDPOINT="asdf"
    )
    def test_partial_azure_settings_but_openai_key(self) -> None:
        call_command("check")

    @override_settings(OPENAI_API_KEY=None, AZURE_OPENAI_API="asdf", AZURE_OPENAI_ENDPOINT=None)
    def test_azure_key_no_openai_key(self) -> None:
        message = (
            "(OpenAI.E001) Either OPENAI_API_KEY or AZURE_OPENAI_API_KEY and"
            " AZURE_OPENAI_ENDPOINT need to be provided."
        )
        with self.assertRaisesMessage(SystemCheckError, message):
            call_command("check")

    @override_settings(OPENAI_API_KEY=None, AZURE_OPENAI_API=None, AZURE_OPENAI_ENDPOINT="asdf")
    def test_azure_endpoint_no_openai_key(self) -> None:
        message = (
            "(OpenAI.E001) Either OPENAI_API_KEY or AZURE_OPENAI_API_KEY and "
            "AZURE_OPENAI_ENDPOINT need to be provided."
        )
        with self.assertRaisesMessage(SystemCheckError, message):
            call_command("check")
