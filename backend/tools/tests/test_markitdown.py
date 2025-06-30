from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from tools.tests.tools import tools_fixture_file_path
from utils.testcases import BaseTransactionTestCase


class MarkItDownViewTestCase(BaseTransactionTestCase):
    def test_markitdown_conversion(self) -> None:
        """Test the markitdown endpoint with docx and xlsx files."""
        # Load placeholder files from fixtures

        # Read docx placeholder
        with open(tools_fixture_file_path("test_document.docx"), "rb") as docx_fp:
            docx_file = SimpleUploadedFile(
                "test_document.docx",
                docx_fp.read(),
                content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )

        # Read xlsx placeholder
        with open(tools_fixture_file_path("test_spreadsheet.xlsx"), "rb") as xlsx_fp:
            xlsx_file = SimpleUploadedFile(
                "test_spreadsheet.xlsx",
                xlsx_fp.read(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )

        # Test with docx file
        response = self.owner_client.post(
            reverse("tools:markitdown"), {"file": docx_file}, format="multipart"
        )

        # Verify the response
        self.assertEqual(
            response.status_code,
            200,
            msg=f"Expected status code 200, got {response.status_code}: {response.data}",
        )
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["filename"], "test_document.docx")
        self.assertEqual(
            response.data["text_content"][:42], "AutoGen: Enabling Next-Gen LLM Application"
        )

        # Test with xlsx file
        response = self.owner_client.post(
            reverse("tools:markitdown"), {"file": xlsx_file}, format="multipart"
        )

        # Verify the response
        self.assertEqual(
            response.status_code,
            200,
            msg=f"Expected status code 200, got {response.status_code}: {response.data}",
        )
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["filename"], "test_spreadsheet.xlsx")
        self.assertEqual(
            response.data["text_content"][:40], "## Sheet1\n| Alpha | Beta | Gamma | Delta"
        )
