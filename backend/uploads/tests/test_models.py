from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile

from tools.models import PaperQACollection
from tools.tests.factories import PaperQACollectionFactory
from uploads.tests.factories import UserUploadFactory
from users.tests.factories import UserFactory
from utils.testcases import BaseTestCase


class UserUploadModelTest(BaseTestCase):
    def setUp(self):
        self.user = UserFactory()
        self.collection = PaperQACollectionFactory(owner=self.user)

        # Create a test file
        self.file_content = b"test file content"
        self.file = SimpleUploadedFile(
            "test.pdf", self.file_content, content_type="application/pdf"
        )

    def test_create_user_upload(self):
        """Test creating a UserUpload object."""
        upload = UserUploadFactory(
            name="test.pdf",
            file=self.file,
            content_type="application/pdf",
            size=len(self.file_content),
            owner=self.user,
        )

        self.assertEqual(upload.name, "test.pdf")
        self.assertEqual(upload.content_type, "application/pdf")
        self.assertEqual(upload.size, len(self.file_content))

        # Test that the file was saved
        self.assertTrue(upload.file.name)

    def test_add_upload_to_collection(self):
        """Test adding a UserUpload to a PaperQACollection."""
        upload = UserUploadFactory(
            name="test.pdf",
            file=self.file,
            content_type="application/pdf",
            size=len(self.file_content),
            owner=self.user,
        )

        # Add the upload to the collection
        self.collection.uploads.add(upload)

        # Test that the upload is in the collection
        self.assertIn(upload, self.collection.uploads.all())

        # Test that the collection is in the upload's collections
        self.assertIn(self.collection, upload.collections.all())

    @patch("tools.tasks.update_collection_index.delay")
    def test_soft_delete_upload_signal(self, mock_update_index):
        """Test that soft-deleting a UserUpload triggers the signal to update collections."""
        # Create an upload and add it to the collection
        upload = UserUploadFactory(
            name="test.pdf",
            file=self.file,
            content_type="application/pdf",
            size=len(self.file_content),
            owner=self.user,
        )
        self.collection.uploads.add(upload)

        # Set the collection state to ready
        self.collection.state = PaperQACollection.States.READY
        self.collection.save()

        # Soft-delete the upload (default behavior)
        upload.delete()

        # Test that the collection state was updated
        self.collection.refresh_from_db()
        self.assertEqual(self.collection.state, PaperQACollection.States.WAITING)

        # Test that the index update task was called
        mock_update_index.assert_called_once_with(self.collection.id)

    @patch("tools.tasks.update_collection_index.delay")
    def test_hard_delete_upload_signal(self, mock_update_index):
        """Test that hard-deleting a UserUpload triggers the signal to update collections."""
        # Create an upload and add it to the collection
        upload = UserUploadFactory(
            name="test.pdf",
            file=self.file,
            content_type="application/pdf",
            size=len(self.file_content),
            owner=self.user,
        )
        self.collection.uploads.add(upload)

        # Set the collection state to ready
        self.collection.state = PaperQACollection.States.READY
        self.collection.save()

        # Hard-delete the upload
        upload.delete(soft=False)

        # Test that the collection state was updated
        self.collection.refresh_from_db()
        self.assertEqual(self.collection.state, PaperQACollection.States.WAITING)

        # Test that the index update task was called
        mock_update_index.assert_called_once_with(self.collection.id)
