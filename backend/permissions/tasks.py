from celery import shared_task
from django.contrib.contenttypes.models import ContentType
from django.db.models import Exists, OuterRef

from permissions import models


@shared_task(ignore_result=True)
def cleanup_permissions() -> None:
    """
    Remove all orphaned ObjectMembership objects.
    """
    # Get all content types.
    content_types = ContentType.objects.all()

    # Loop through each content type
    for content_type in content_types:
        # Get the model class for the content type.
        model_class = content_type.model_class()

        # If the model class is None, it means the model for this content type has been deleted.
        if model_class is None:
            models.ObjectMembership.objects.filter(content_type=content_type).delete()

        else:
            # Create a subquery that checks the existence of the object in its model class.
            exists = Exists(
                model_class.objects.filter(id=OuterRef("object_id"))  # type: ignore[attr-defined]
            )

            # Delete all ObjectMembership objects of this content type that do not exist in their
            # model class.
            models.ObjectMembership.objects.filter(content_type=content_type).exclude(
                object_id__in=exists
            ).delete()
