from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from tools.models import PaperQACollection
from tools.tests.factories import PaperQACollectionFactory
from uploads.tests.factories import UserUploadFactory
from utils.testcases import BaseTestCase


class UserUploadViewsTest(BaseTestCase):
    def setUp(self):
        super().setUp()  # Make sure to call the parent's setUp method
        # Create a collection
        self.collection = PaperQACollectionFactory(name="test-collection", owner=self.owner_user)

        # Create a test file
        self.file_content = b"test file content"
        self.file = SimpleUploadedFile(
            "test.pdf", self.file_content, content_type="application/pdf"
        )

    @patch("tools.tasks.update_collection_index.delay")
    def test_add_upload(self, mock_update_index):
        """Test adding an existing upload to a collection."""
        # First create an upload
        upload = UserUploadFactory(
            name="test.pdf",
            file=self.file,
            content_type="application/pdf",
            size=len(self.file_content),
            owner=self.owner_user,
        )

        url = reverse(
            "tools:paperqa-collection-add-upload",
            kwargs={"public_id": self.collection.public_id},
        )

        data = {
            "upload_id": upload.public_id,
        }

        response = self.owner_client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "test.pdf")
        self.assertEqual(response.data["content_type"], "application/pdf")
        self.assertEqual(response.data["size"], len(self.file_content))

        # Test that the upload was added to the collection
        self.assertIn(upload, self.collection.uploads.all())

        # Test that the collection state was updated
        self.collection.refresh_from_db()
        self.assertEqual(self.collection.state, PaperQACollection.States.WAITING)

        # Test that the index update task was called
        mock_update_index.assert_called_once_with(self.collection.id)

    def test_list_files(self):
        """Test listing files in a collection."""
        # Create a file and add it to the collection
        upload = UserUploadFactory(
            name="test.pdf",
            file=self.file,
            content_type="application/pdf",
            size=len(self.file_content),
            owner=self.owner_user,
        )
        self.collection.uploads.add(upload)

        url = reverse(
            "tools:paperqa-collection-files",
            kwargs={"public_id": self.collection.public_id},
        )

        response = self.owner_client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "test.pdf")
        self.assertEqual(response.data[0]["content_type"], "application/pdf")
        self.assertEqual(response.data[0]["size"], len(self.file_content))

    @patch("tools.tasks.update_collection_index.delay")
    def test_remove_upload(self, mock_update_index):
        """Test removing a file from a collection."""
        # Create a file and add it to the collection
        upload = UserUploadFactory(
            name="test.pdf",
            file=self.file,
            content_type="application/pdf",
            size=len(self.file_content),
            owner=self.owner_user,
        )
        self.collection.uploads.add(upload)

        url = reverse(
            "tools:paperqa-collection-remove-upload",
            kwargs={
                "public_id": self.collection.public_id,
                "upload_id": upload.public_id,
            },
        )

        response = self.owner_client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Test that the upload was removed from the collection
        self.collection.refresh_from_db()
        self.assertNotIn(upload, self.collection.uploads.all())

        # Test that the collection state was updated
        self.assertEqual(self.collection.state, PaperQACollection.States.WAITING)

        # Test that the index update task was called
        mock_update_index.assert_called_once_with(self.collection.id)
