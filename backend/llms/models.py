from django.db import models

import utils.models
import utils.tokens


class LLModel(utils.models.BaseModel):
    """
    Model for a large language model (LLM) that can be used for various tasks.
    """

    name = models.CharField(max_length=255, unique=True)
    identifier = models.CharField(max_length=255, unique=True)
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

    class Meta:
        verbose_name = "LLM"
        verbose_name_plural = "LLMs"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
