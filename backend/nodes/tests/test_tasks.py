from datetime import timedelta
from hashlib import sha256

from django.test import TransactionTestCase
from django.utils import timezone

from nodes import models, tasks
from nodes.tests import factories


class DocumentVersioningTestCase(TransactionTestCase):
    def test_document_versioning(self) -> None:
        # Create a document
        document = factories.DocumentFactory(json={"test": "data"}, data=b"test data")

        # Run the task
        with self.assertNumQueries(3):
            # Two queries to check and one insert to create the version
            tasks.document_versioning()

        # Since there wasn't any previous version, there should be only one version now
        self.assertEqual(models.DocumentVersion.objects.count(), 1)
        document_version = models.DocumentVersion.objects.first()
        self.assertEqual(document_version.document, document)
        self.assertEqual(document_version.data, b"test data")
        self.assertEqual(
            document_version.json_hash, sha256(str(document.json).encode()).hexdigest()
        )
        self.assertEqual(document_version.document_type, document.document_type)

        # Run the task again
        with self.assertNumQueries(2):
            # Only two queries to check and no inserts
            tasks.document_versioning()

        # There should be no new versions since the document hasn't changed and the interval hasn't
        # passed.
        self.assertEqual(models.DocumentVersion.objects.count(), 1)

        # Change the document
        document.json = {"new": "data"}
        document.data = b"new data"
        document.save()

        # Run the task again
        tasks.document_versioning()

        # There still should be only one version since the interval hasn't passed
        self.assertEqual(models.DocumentVersion.objects.count(), 1)

        # Set the interval to 0 and run the task again
        with self.settings(NODE_VERSIONING_INTERVAL=0):
            tasks.document_versioning()

        # There should be a new version now
        self.assertEqual(models.DocumentVersion.objects.count(), 2)
        document_version = models.DocumentVersion.objects.last()
        self.assertEqual(document_version.document, document)
        self.assertEqual(document_version.data, b"new data")
        self.assertEqual(
            document_version.json_hash, sha256(str(document.json).encode()).hexdigest()
        )
        self.assertEqual(document_version.document_type, document.document_type)

        # But if we run the task again, there should be no new versions since the document hasn't
        # changed

        with self.assertNumQueries(2):
            # Only two queries to check and no inserts
            tasks.document_versioning()
        self.assertEqual(models.DocumentVersion.objects.count(), 2)

    def test_version_creation_with_older_version(self) -> None:
        """
        Regression test to catch a bug where the task would create a new version even if there was
        a new version that's within the threshold and an older version that has a different hash
        and is outside the threshold.
        """

        document = factories.DocumentFactory(json={"test": "data"}, data=b"test data")
        tasks.document_versioning()

        self.assertEqual(models.DocumentVersion.objects.count(), 1)

        # Change the document
        document.json = {"new": "data"}
        document.data = b"new data"
        document.save()

        # Make this version and the document updated_at older.
        models.DocumentVersion.objects.update(
            created_at=timezone.now() - timedelta(days=1),
            updated_at=timezone.now() - timedelta(days=1),
        )
        models.Document.objects.update(
            created_at=timezone.now() - timedelta(days=1),
            updated_at=timezone.now() - timedelta(days=1),
        )

        # Run the task again
        tasks.document_versioning()
        self.assertEqual(models.DocumentVersion.objects.count(), 2)

        # Run the task again, this shouldn't create a new version
        tasks.document_versioning()
        self.assertEqual(models.DocumentVersion.objects.count(), 2)
