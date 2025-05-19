import typing

from django.conf import settings
from django.core.checks import Error, register


@register("Storage")
def check_storage_configuration(app_configs: typing.Any, **kwargs: typing.Any) -> list[Error]:
    """
    Check that a valid combination of storage environment variables is set.

    For S3 storage:
    - DJANGO_STORAGE_BACKEND should be "storages.backends.s3.S3Storage" or not set (default)
    - BUCKET_NAME should be set

    For Azure storage:
    - DJANGO_STORAGE_BACKEND should be "storages.backends.azure_storage.AzureStorage"
    - AZURE_CONTAINER should be set
    - Either AZURE_ACCOUNT_NAME and AZURE_ACCOUNT_KEY should be set, or AZURE_CONNECTION_STRING
      should be set
    """
    errors = []

    # Get the storage backend
    storage_backend = settings.STORAGES["default"]["BACKEND"]
    storage_options = settings.STORAGES["default"]["OPTIONS"]

    # Check S3 storage configuration
    if storage_backend == "storages.backends.s3.S3Storage":
        if not storage_options.get("bucket_name"):
            errors.append(
                Error(
                    "BUCKET_NAME must be set when using S3 storage.",
                    id="Storage.E001",
                )
            )

    # Check Azure storage configuration
    elif storage_backend == "storages.backends.azure_storage.AzureStorage":
        if not storage_options.get("azure_container"):
            errors.append(
                Error(
                    "AZURE_CONTAINER must be set when using Azure storage.",
                    id="Storage.E002",
                )
            )

        # Check that either account credentials or connection string is provided
        has_account_creds = storage_options.get("account_name") and storage_options.get(
            "account_key"
        )
        has_connection_string = storage_options.get("connection_string")

        if not (has_account_creds or has_connection_string):
            errors.append(
                Error(
                    "Either AZURE_ACCOUNT_NAME and AZURE_ACCOUNT_KEY, or AZURE_CONNECTION_STRING "
                    "must be set when using Azure storage.",
                    id="Storage.E003",
                )
            )

    return errors
