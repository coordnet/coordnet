import litellm
from django.conf import settings
from django.db import models

import utils.models
import utils.tokens

# Provider choices for LLMs
PROVIDER_CHOICES = [
    ("openai", "OpenAI"),
    ("azure", "Azure OpenAI"),
    ("anthropic", "Anthropic"),
    ("google_ai", "Google AI Studio"),
    ("cohere", "Cohere"),
    ("mistral", "Mistral AI"),
    ("other", "Other"),
]


class LLModel(utils.models.BaseModel):
    """
    Model for a large language model (LLM) that can be used for various tasks.
    """

    name = models.CharField(max_length=255, unique=True)
    identifier = models.CharField(max_length=255, unique=True)
    provider = models.CharField(
        max_length=50,
        choices=PROVIDER_CHOICES,
        default="openai",
        help_text="The provider of this LLM",
    )
    description = models.TextField(blank=True, null=True)
    is_available = models.BooleanField("Available for new items", default=True)
    replacement = models.ForeignKey(
        "self",
        verbose_name="Replacement for unavailable models.",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    disabled = models.BooleanField("Will not be executed", default=False)
    input_token_limit = models.PositiveIntegerField(blank=True, null=True)
    output_token_limit = models.PositiveIntegerField(blank=True, null=True)
    api_base = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Custom API base URL for this model (if different from default)",
    )

    @property
    def should_run(self):
        """
        Determines if the model should run based on its availability and disabled status.
        """
        return not self.disabled

    @property
    def should_be_displayed(self):
        """
        Determines if the model should be displayed based on its availability and disabled status.
        """
        return self.is_available and not self.disabled

    @property
    def model_to_use(self):
        """
        Returns the model to use based on its availability and disabled status.
        If the model is disabled, it returns the replacement model if available.
        """
        if self.should_run:
            return self

        visited = set()
        current = self.replacement
        while current:
            if current.id in visited:
                # Detected a cycle
                return None
            if current.should_run:
                return current

            visited.add(current.id)
            current = current.replacement

        return None

    def count_tokens(self, text: str) -> int:
        """
        Count the number of tokens in a given text using the model's tokenizer.
        This is a placeholder method and should be implemented based on the
        specific tokenizer used by the model.
        """
        return utils.tokens.token_count(text, self.identifier)

    def get_litellm_model_name(self) -> str:
        """
        Returns the model name in the format expected by litellm.
        For most providers, this is provider/model_name.
        """
        # For OpenAI, we just use the identifier directly
        if self.provider == "openai":
            return self.identifier
        # For Azure, we use the identifier directly as well
        elif self.provider == "azure":
            return self.identifier
        # For other providers, we use the provider/identifier format
        else:
            return f"{self.provider}/{self.identifier}"

    def get_litellm_client_kwargs(self) -> dict:
        """
        Returns the kwargs needed to initialize a litellm client for this model.
        """
        kwargs = {}

        # Add provider-specific settings
        if self.provider == "openai":
            kwargs["api_key"] = settings.OPENAI_API_KEY
            if settings.OPENAI_BASE_URL:
                kwargs["base_url"] = settings.OPENAI_BASE_URL
        elif self.provider == "azure":
            kwargs["api_key"] = settings.AZURE_OPENAI_API_KEY
            kwargs["azure_endpoint"] = settings.AZURE_OPENAI_ENDPOINT
            kwargs["api_version"] = settings.AZURE_OPENAI_API_VERSION

        # Override with model-specific API base if provided
        if self.api_base:
            kwargs["base_url"] = self.api_base

        return kwargs

    def get_litellm_completion(self, messages, **kwargs):
        """
        Get a completion from the LLM using litellm.

        Args:
            messages: List of message dictionaries in the format expected by the OpenAI API
            **kwargs: Additional arguments to pass to the litellm.completion() function

        Returns:
            The completion response from the LLM
        """
        model = self.get_litellm_model_name()
        client_kwargs = self.get_litellm_client_kwargs()

        # Merge client kwargs with any provided kwargs
        completion_kwargs = {**client_kwargs, **kwargs}

        return litellm.completion(model=model, messages=messages, **completion_kwargs)

    def query(self, prompt, system_message=None, **kwargs):
        """
        Query the LLM with a prompt and optional system message.
        This is a convenience method for simple queries.

        Args:
            prompt: The user prompt to send to the LLM
            system_message: Optional system message to include
            **kwargs: Additional arguments to pass to get_litellm_completion

        Returns:
            The text response from the LLM
        """
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        messages.append({"role": "user", "content": prompt})

        response = self.get_litellm_completion(messages=messages, **kwargs)
        return response.choices[0].message.content

    async def async_query(self, prompt, system_message=None, **kwargs):
        """
        Asynchronously query the LLM with a prompt and optional system message.
        This is a convenience method for simple async queries.

        Args:
            prompt: The user prompt to send to the LLM
            system_message: Optional system message to include
            **kwargs: Additional arguments to pass to get_async_litellm_completion

        Returns:
            The text response from the LLM
        """
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        messages.append({"role": "user", "content": prompt})

        response = await self.get_async_litellm_completion(messages=messages, **kwargs)
        return response.choices[0].message.content

    async def get_async_litellm_completion(self, messages, **kwargs):
        """
        Get a completion from the LLM using litellm's async API.

        Args:
            messages: List of message dictionaries in the format expected by the OpenAI API
            **kwargs: Additional arguments to pass to the litellm.acompletion() function

        Returns:
            The completion response from the LLM
        """

        model = self.get_litellm_model_name()
        client_kwargs = self.get_litellm_client_kwargs()

        # Merge client kwargs with any provided kwargs
        completion_kwargs = {**client_kwargs, **kwargs}

        return await litellm.acompletion(model=model, messages=messages, **completion_kwargs)

    class Meta:
        verbose_name = "LLM"
        verbose_name_plural = "LLMs"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
