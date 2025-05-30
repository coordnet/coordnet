import factory
from django.core.files.uploadedfile import SimpleUploadedFile

from permissions.tests.factories import BaseMembershipModelMixinFactory
from uploads import models


class UserUploadFactory(BaseMembershipModelMixinFactory):
    """Factory for creating UserUpload objects."""

    name = factory.Faker("file_name", extension="pdf")
    content_type = "application/pdf"
    size = factory.Faker("random_int", min=1000, max=10000)

    # Create a simple PDF file
    @factory.lazy_attribute
    def file(self):
        file_content = b"test file content"
        return SimpleUploadedFile(self.name, file_content, content_type=self.content_type)

    class Meta:
        model = models.UserUpload
