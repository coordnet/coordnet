"""
Custom storage classes for handling different access patterns to object storage.

This module provides two storage classes:
1. InternalS3Storage: For internal docker network access using the 'minio' hostname
2. BrowserS3Storage: For browser access via signed URLs using 'localhost:<port>'

Both classes inherit from django-storages S3Storage and point to the same bucket,
but with different endpoint configurations.
"""

from django.core.files.storage import InvalidStorageError, storages
from storages.backends.s3 import S3Storage


def get_storage_class(name):
    """
    Get the storage class by name. If the name is not found, return the default storage.
    This is required becase in local development we need two different storage classes to access
    the same bucket in MinIO, one for internal access and one for browser access.
    """
    try:
        return storages[name]
    except InvalidStorageError:
        return storages["default"]


class InternalS3Storage(S3Storage):
    """
    Storage class for internal docker network access.

    This class is used when the backend needs to access files directly,
    such as when downloading PDFs to update a PaperQACollection index.
    It uses the 'minio' hostname which works within the docker network.
    """

    def __init__(self, **settings):
        # Use the same settings as the default storage, but ensure we're using
        # the internal endpoint URL (minio hostname)
        super().__init__(**settings)

        # Override the endpoint_url to use the internal minio hostname
        # This is used for internal docker network access
        if "endpoint_url" in settings and settings["endpoint_url"]:
            # If we have a custom endpoint URL, use it but replace any localhost/127.0.0.1
            # with 'minio' for internal access
            import re

            self.endpoint_url = re.sub(
                r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
                "http://minio:9000",
                settings["endpoint_url"],
            )
        else:
            # Default to minio:9000 if no endpoint_url is provided
            self.endpoint_url = "http://minio:9000"


class BrowserS3Storage(S3Storage):
    """
    Storage class for browser access via signed URLs.

    This class is used when generating URLs that will be accessed by the browser,
    such as when creating signed URLs for file downloads.
    It uses the 'localhost:<port>' hostname which works for browser access.
    """

    def __init__(self, **settings):
        # Use the same settings as the default storage
        super().__init__(**settings)

        # The endpoint_url and custom_domain are already configured in settings
        # for browser access, so we don't need to override them here.
