from unittest import mock

from django.core.management import call_command
from django.core.management.base import SystemCheckError
from django.test import SimpleTestCase, TestCase, override_settings

from llms.models import LLModel
from llms.utils import get_default_llm_model, get_llm_model


class LLMSystemCheckTestCase(SimpleTestCase):
    @override_settings(OPENAI_API_KEY=None)
    def test_no_key_set(self) -> None:
        message = (
            "(LLM.E001) Either OPENAI_API_KEY or AZURE_OPENAI_API_KEY and "
            "AZURE_OPENAI_ENDPOINT need to be provided."
        )
        with self.assertRaisesMessage(SystemCheckError, message):
            call_command("check")

    @override_settings(
        OPENAI_API_KEY="sk-test-123", AZURE_OPENAI_API_KEY=None, AZURE_OPENAI_ENDPOINT="asdf"
    )
    def test_partial_azure_settings_but_openai_key(self) -> None:
        call_command("check")

    @override_settings(OPENAI_API_KEY=None, AZURE_OPENAI_API_KEY="asdf", AZURE_OPENAI_ENDPOINT=None)
    def test_azure_key_no_openai_key(self) -> None:
        message = (
            "(LLM.E001) Either OPENAI_API_KEY or AZURE_OPENAI_API_KEY and"
            " AZURE_OPENAI_ENDPOINT need to be provided."
        )
        with self.assertRaisesMessage(SystemCheckError, message):
            call_command("check")

    @override_settings(OPENAI_API_KEY=None, AZURE_OPENAI_API_KEY=None, AZURE_OPENAI_ENDPOINT="asdf")
    def test_azure_endpoint_no_openai_key(self) -> None:
        message = (
            "(LLM.E001) Either OPENAI_API_KEY or AZURE_OPENAI_API_KEY and "
            "AZURE_OPENAI_ENDPOINT need to be provided."
        )
        with self.assertRaisesMessage(SystemCheckError, message):
            call_command("check")


class LLModelUtilsTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create test LLModel instances
        cls.default_model = LLModel.objects.create(
            name="Default Model",
            identifier="default-model",
            provider="openai",
            is_available=True,
            disabled=False,
        )
        cls.disabled_model = LLModel.objects.create(
            name="Disabled Model",
            identifier="disabled-model",
            provider="openai",
            is_available=True,
            disabled=True,
        )
        cls.replacement_model = LLModel.objects.create(
            name="Replacement Model",
            identifier="replacement-model",
            provider="openai",
            is_available=True,
            disabled=False,
        )
        # Set replacement for disabled model
        cls.disabled_model.replacement = cls.replacement_model
        cls.disabled_model.save()

    def test_get_llm_model(self):
        # Test getting an existing model
        model = get_llm_model("default-model")
        self.assertEqual(model.identifier, "default-model")

        # Test getting a disabled model with replacement
        model = get_llm_model("disabled-model")
        self.assertEqual(model.identifier, "replacement-model")

        # Test getting a non-existent model
        with self.assertRaises(LLModel.DoesNotExist):
            get_llm_model("non-existent-model")

    def test_get_default_llm_model(self):
        # Test getting the default model
        model = get_default_llm_model()
        self.assertEqual(model.identifier, "default-model")

        # Test when no available models exist
        with mock.patch.object(LLModel.objects, "filter", return_value=LLModel.objects.none()):
            with self.assertRaises(LLModel.DoesNotExist):
                get_default_llm_model()


class LLModelMethodsTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create test LLModel instances
        cls.openai_model = LLModel.objects.create(
            name="OpenAI Model",
            identifier="gpt-4",
            provider="openai",
            is_available=True,
            disabled=False,
        )
        cls.azure_model = LLModel.objects.create(
            name="Azure Model",
            identifier="azure-gpt-4",
            provider="azure",
            is_available=True,
            disabled=False,
        )
        cls.anthropic_model = LLModel.objects.create(
            name="Anthropic Model",
            identifier="claude-3",
            provider="anthropic",
            is_available=True,
            disabled=False,
        )

    def test_get_litellm_model_name(self):
        # Test OpenAI model
        self.assertEqual(self.openai_model.get_litellm_model_name(), "gpt-4")

        # Test Azure model
        self.assertEqual(self.azure_model.get_litellm_model_name(), "azure-gpt-4")

        # Test other provider model
        self.assertEqual(self.anthropic_model.get_litellm_model_name(), "anthropic/claude-3")

    @override_settings(
        OPENAI_API_KEY="sk-test-123",
        OPENAI_BASE_URL="https://api.openai.com/v1",
        AZURE_OPENAI_API_KEY="azure-key",
        AZURE_OPENAI_ENDPOINT="https://azure-endpoint",
        AZURE_OPENAI_API_VERSION="2023-05-15",
    )
    def test_get_litellm_client_kwargs(self):
        # Test OpenAI model
        openai_kwargs = self.openai_model.get_litellm_client_kwargs()
        self.assertEqual(openai_kwargs["api_key"], "sk-test-123")
        self.assertEqual(openai_kwargs["base_url"], "https://api.openai.com/v1")

        # Test Azure model
        azure_kwargs = self.azure_model.get_litellm_client_kwargs()
        self.assertEqual(azure_kwargs["api_key"], "azure-key")
        self.assertEqual(azure_kwargs["azure_endpoint"], "https://azure-endpoint")
        self.assertEqual(azure_kwargs["api_version"], "2023-05-15")

        # Test custom API base
        self.anthropic_model.api_base = "https://custom-api-base"
        self.anthropic_model.save()
        anthropic_kwargs = self.anthropic_model.get_litellm_client_kwargs()
        self.assertEqual(anthropic_kwargs["base_url"], "https://custom-api-base")

    @mock.patch("litellm.completion")
    def test_get_litellm_completion(self, mock_completion):
        # Setup mock response
        mock_response = mock.MagicMock()
        mock_completion.return_value = mock_response

        # Test completion
        messages = [{"role": "user", "content": "Hello"}]
        response = self.openai_model.get_litellm_completion(messages=messages)

        # Verify mock was called correctly
        mock_completion.assert_called_once()
        args, kwargs = mock_completion.call_args
        self.assertEqual(kwargs["model"], "gpt-4")
        self.assertEqual(kwargs["messages"], messages)
        self.assertEqual(response, mock_response)

    @mock.patch("litellm.acompletion")
    async def test_get_async_litellm_completion(self, mock_acompletion):
        # Setup mock response
        mock_response = mock.MagicMock()
        mock_acompletion.return_value = mock_response

        # Test async completion
        messages = [{"role": "user", "content": "Hello"}]
        response = await self.openai_model.get_async_litellm_completion(messages=messages)

        # Verify mock was called correctly
        mock_acompletion.assert_called_once()
        args, kwargs = mock_acompletion.call_args
        self.assertEqual(kwargs["model"], "gpt-4")
        self.assertEqual(kwargs["messages"], messages)
        self.assertEqual(response, mock_response)

    @mock.patch("litellm.completion")
    def test_query(self, mock_completion):
        # Setup mock response
        mock_response = mock.MagicMock()
        mock_response.choices[0].message.content = "Test response"
        mock_completion.return_value = mock_response

        # Test query with just prompt
        response = self.openai_model.query("Hello")
        self.assertEqual(response, "Test response")

        # Test query with system message
        response = self.openai_model.query("Hello", system_message="You are a helpful assistant")
        self.assertEqual(response, "Test response")

        # Verify mock was called correctly for the second call
        args, kwargs = mock_completion.call_args
        self.assertEqual(kwargs["model"], "gpt-4")
        self.assertEqual(len(kwargs["messages"]), 2)
        self.assertEqual(kwargs["messages"][0]["role"], "system")
        self.assertEqual(kwargs["messages"][1]["role"], "user")

    @mock.patch("litellm.acompletion")
    async def test_async_query(self, mock_acompletion):
        # Setup mock response
        mock_response = mock.MagicMock()
        mock_response.choices[0].message.content = "Test response"
        mock_acompletion.return_value = mock_response

        # Test async query
        response = await self.openai_model.async_query("Hello")
        self.assertEqual(response, "Test response")

        # Verify mock was called correctly
        args, kwargs = mock_acompletion.call_args
        self.assertEqual(kwargs["model"], "gpt-4")
        self.assertEqual(len(kwargs["messages"]), 1)
        self.assertEqual(kwargs["messages"][0]["role"], "user")
