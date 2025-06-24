import uuid
from unittest.mock import MagicMock, patch

from django.urls import reverse
from rest_framework import status

from utils.testcases import BaseTransactionTestCase


class FutureHouseViewTestCase(BaseTransactionTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.agent_name = "job-futurehouse-chimp"

    def test_futurehouse_query_success(self) -> None:
        """Test successful FutureHouse query."""
        # Mock the futurehouse_client module
        mock_client = MagicMock()
        mock_task_request = MagicMock()
        mock_response = {"answer": "Test response", "sources": []}
        mock_client.run_tasks_until_done.return_value = mock_response

        with (
            patch("tools.views.futurehouse_client") as mock_futurehouse,
            patch("tools.views.TaskRequest") as mock_task_request_class,
        ):
            mock_futurehouse.FutureHouseClient.return_value = mock_client
            mock_task_request_class.return_value = mock_task_request

            response = self.owner_client.post(
                reverse("tools:futurehouse"),
                {"question": "What is machine learning?", "agent_name": self.agent_name},
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data, mock_response)
            mock_task_request_class.assert_called_once_with(
                query="What is machine learning?", name=self.agent_name, id=None
            )
            mock_client.run_tasks_until_done.assert_called_once_with(mock_task_request)

    def test_futurehouse_query_with_uuid_async_mode(self) -> None:
        """Test FutureHouse query with UUID switches to async mode."""
        # Mock the futurehouse_client module
        mock_client = MagicMock()
        mock_task_request = MagicMock()
        test_uuid = uuid.uuid4()
        mock_client.create_task.return_value = str(test_uuid)

        with (
            patch("tools.views.futurehouse_client") as mock_futurehouse,
            patch("tools.views.TaskRequest") as mock_task_request_class,
        ):
            mock_futurehouse.FutureHouseClient.return_value = mock_client
            mock_task_request_class.return_value = mock_task_request

            response = self.owner_client.post(
                reverse("tools:futurehouse"),
                {
                    "question": "What is machine learning?",
                    "agent_name": self.agent_name,
                    "task_id": str(test_uuid),
                },
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["task_id"], str(test_uuid))
            self.assertEqual(response.data["status"], "created")
            self.assertIn("message", response.data)
            mock_task_request_class.assert_called_once_with(
                query="What is machine learning?", name=self.agent_name, id=test_uuid
            )
            mock_client.create_task.assert_called_once_with(mock_task_request)
            # Ensure run_tasks_until_done is NOT called in async mode
            mock_client.run_tasks_until_done.assert_not_called()

    def test_futurehouse_dummy_agent_validation(self) -> None:
        """Test that 'dummy' agent name is rejected."""
        response = self.owner_client.post(
            reverse("tools:futurehouse"),
            {"question": "What is machine learning?", "agent_name": "dummy"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("agent_name", response.data)

    def test_futurehouse_missing_required_fields(self) -> None:
        """Test validation when required fields are missing."""
        # Test missing question
        response = self.owner_client.post(
            reverse("tools:futurehouse"), {"agent_name": self.agent_name}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("question", response.data)

        # Test missing agent_name
        response = self.owner_client.post(
            reverse("tools:futurehouse"), {"question": "What is machine learning?"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("agent_name", response.data)

    def test_futurehouse_client_exception(self) -> None:
        """Test handling of exceptions from futurehouse client."""
        mock_client = MagicMock()
        mock_client.run_tasks_until_done.side_effect = Exception("API Error")

        with (
            patch("tools.views.futurehouse_client") as mock_futurehouse,
            patch("tools.views.TaskRequest") as mock_task_request_class,
        ):
            mock_futurehouse.FutureHouseClient.return_value = mock_client
            mock_task_request_class.return_value = MagicMock()

            response = self.owner_client.post(
                reverse("tools:futurehouse"),
                {"question": "What is machine learning?", "agent_name": self.agent_name},
                format="json",
            )

            self.assertEqual(
                response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR, response.data
            )
            self.assertIn("An error occurred while querying FutureHouse", response.data["error"])


class FutureHouseTaskStatusViewTestCase(BaseTransactionTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.agent_name = "job-futurehouse-chimp"

    def test_task_status_success(self) -> None:
        """Test successful task status retrieval."""
        mock_client = MagicMock()
        mock_task_response = MagicMock()
        mock_task_response.status = "completed"
        mock_task_response.job_name = self.agent_name
        mock_task_response.response = {"answer": "Test response", "sources": []}
        mock_client.get_task.return_value = mock_task_response

        task_id = "test-task-id-123"

        with patch("tools.views.futurehouse_client") as mock_futurehouse:
            mock_futurehouse.FutureHouseClient.return_value = mock_client

            response = self.owner_client.get(
                reverse("tools:futurehouse-status", kwargs={"task_id": task_id})
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["task_id"], task_id)
            self.assertEqual(response.data["status"], "completed")
            self.assertEqual(response.data["job_name"], self.agent_name)
            self.assertEqual(response.data["result"], {"answer": "Test response", "sources": []})
            mock_client.get_task.assert_called_once_with(task_id=task_id)

    def test_task_status_in_progress(self) -> None:
        """Test task status retrieval for in-progress task."""
        mock_client = MagicMock()
        mock_task_response = MagicMock()
        mock_task_response.status = "running"
        mock_task_response.job_name = self.agent_name
        mock_client.get_task.return_value = mock_task_response

        task_id = "test-task-id-456"

        with patch("tools.views.futurehouse_client") as mock_futurehouse:
            mock_futurehouse.FutureHouseClient.return_value = mock_client

            response = self.owner_client.get(
                reverse("tools:futurehouse-status", kwargs={"task_id": task_id})
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["task_id"], task_id)
            self.assertEqual(response.data["status"], "running")
            self.assertEqual(response.data["job_name"], self.agent_name)
            # Should not include result for in-progress tasks
            self.assertNotIn("result", response.data)
            mock_client.get_task.assert_called_once_with(task_id=task_id)

    def test_task_status_permission_error(self) -> None:
        """Test task status retrieval with permission error."""
        mock_client = MagicMock()
        mock_client.get_task.side_effect = PermissionError(
            "Permission denied for task test-task-id"
        )

        task_id = "test-task-id-forbidden"

        with patch("tools.views.futurehouse_client") as mock_futurehouse:
            mock_futurehouse.FutureHouseClient.return_value = mock_client

            response = self.owner_client.get(
                reverse("tools:futurehouse-status", kwargs={"task_id": task_id})
            )

            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
            self.assertIn("Permission denied", response.data["error"])

    def test_task_status_general_error(self) -> None:
        """Test task status retrieval with general error."""
        mock_client = MagicMock()
        mock_client.get_task.side_effect = Exception("API Error")

        task_id = "test-task-id-error"

        with patch("tools.views.futurehouse_client") as mock_futurehouse:
            mock_futurehouse.FutureHouseClient.return_value = mock_client

            response = self.owner_client.get(
                reverse("tools:futurehouse-status", kwargs={"task_id": task_id})
            )

            self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
            self.assertIn("An error occurred while checking task status", response.data["error"])
