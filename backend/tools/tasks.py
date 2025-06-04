import io
import zipfile
from pathlib import Path

from asgiref.sync import async_to_sync
from celery import shared_task
from django.conf import settings
from paperqa import Settings
from paperqa.agents import get_directory_index

import utils.storage
from tools.models import PaperQACollection


@shared_task(soft_time_limit=3600, time_limit=3600)
def update_collection_index(collection_id):
    """
    Update the index for a PaperQACollection.
    This task is triggered when files are uploaded or deleted.
    """
    try:
        collection = PaperQACollection.objects.get(id=collection_id)

        # Set the collection state to processing
        collection.state = PaperQACollection.States.PROCESSING
        collection.save(update_fields=["state"])

        # Get all files for this collection
        uploads = collection.uploads.all()

        pdf_dir = Path(settings.MEDIA_ROOT) / "paperqa" / "pdfs" / str(collection.public_id)
        index_dir = Path(settings.MEDIA_ROOT) / "paperqa" / "indices" / str(collection.public_id)

        # Create directories if they don't exist
        pdf_dir.mkdir(parents=True, exist_ok=True)
        index_dir.mkdir(parents=True, exist_ok=True)

        # Load existing index if it exists
        if collection.index:
            with zipfile.ZipFile(io.BytesIO(collection.index)) as zf:
                zf.extractall(index_dir)

        # Download files from object storage
        for upload in uploads:
            print(f"Processing upload: {upload.name} ({upload.content_type})")
            if upload.content_type == "application/pdf":
                # Get the file path in storage
                file_name = upload.file.name

                # Use internal storage to access the file directly
                if utils.storage.get_storage_class("internal").exists(file_name):
                    print(f"Accessing {upload.name} from internal storage.")
                    # Save the file to the temporary directory
                    file_path = pdf_dir / upload.name
                    with open(file_path, "wb") as f:
                        f.write(utils.storage.get_storage_class("internal").open(file_name).read())
                    print(f"Downloaded {upload.name} successfully.")
                else:
                    print(f"File {upload.name} not found in storage.")

        # Configure PaperQA settings
        paperqa_settings = Settings(
            temperature=0.5,
            paper_directory=str(pdf_dir),
            index_directory=str(index_dir),
            # embedding="text-embedding-3-large",
        )

        # Generate the directory index for the PDFs
        async_to_sync(get_directory_index)(settings=paperqa_settings)

        # Save the index to the collection model
        index_buffer = io.BytesIO()
        with zipfile.ZipFile(index_buffer, "w") as zf:
            for index_file in index_dir.rglob("*"):
                print(f"Adding {index_file} to index zip")
                zf.write(index_file, index_file.relative_to(index_dir))
        index_buffer.seek(0)
        collection.index = index_buffer.getvalue()

        # Update the collection state to ready
        collection.state = PaperQACollection.States.READY
        collection.save(update_fields=["state", "index"])

        return True
    except Exception as e:
        # If there's an error, set the collection state to error
        try:
            collection.state = PaperQACollection.States.ERROR
            collection.save(update_fields=["state"])
        except Exception:
            # If saving the state fails, we can ignore it
            pass

        # Re-raise the exception to mark the task as failed
        raise e
