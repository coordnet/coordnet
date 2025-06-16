from django.db.models.signals import pre_delete
from django.dispatch import receiver

import tools.tasks
from tools.models import PaperQACollection
from uploads.models import UserUpload
from utils.models import post_soft_delete


@receiver(
    post_soft_delete, sender=UserUpload, dispatch_uid="update_collections_on_upload_soft_delete"
)
@receiver(pre_delete, sender=UserUpload, dispatch_uid="update_collections_on_upload_hard_delete")
def update_collections_on_upload_soft_delete(sender, instance, **kwargs):
    """
    When a UserUpload is soft-deleted, update all collections that contained it.
    """

    # Get all collections that contained this upload
    collections = instance.collections.all()

    # Update each collection
    for collection in collections:
        # Set the collection state to waiting
        collection.state = PaperQACollection.States.WAITING
        collection.save(update_fields=["state"])

        # Trigger the index update task
        tools.tasks.update_collection_index.delay(collection.id)
