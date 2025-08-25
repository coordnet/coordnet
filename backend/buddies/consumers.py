import asyncio
import json
import logging
from typing import Any, Optional

import rest_framework.exceptions
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import Token

import buddies.models
import buddies.serializers
import llms.utils

logger = logging.getLogger(__name__)


class QueryConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for buddy query functionality with proper lifecycle management."""

    HEARTBEAT_INTERVAL = 30  # seconds
    CLOSE_CODES = {
        'NORMAL_CLOSURE': 1000,
        'INVALID_DATA': 1007,
        'POLICY_VIOLATION': 1008,
        'INTERNAL_ERROR': 1011,
        'SERVICE_RESTART': 1012,
        'TRY_AGAIN_LATER': 1013,
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.heartbeat_task = None
        self.is_connected = False
        self.active_response = None
        self.user = None

    async def connect(self):
        """Handle WebSocket connection setup."""
        self.is_connected = True
        await self.accept()
        self.heartbeat_task = asyncio.create_task(self._heartbeat())
        logger.info(f"WebSocket connection established for {self.channel_name}")

    async def disconnect(self, close_code):
        """Clean up resources on disconnect."""
        self.is_connected = False
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
            try:
                await self.heartbeat_task
            except asyncio.CancelledError:
                pass
        
        if self.active_response:
            try:
                await self.active_response.aclose()
            except Exception as e:
                logger.error(f"Error closing active response: {e}")
        
        logger.info(f"WebSocket connection closed for {self.channel_name} with code {close_code}")

    async def receive(self, text_data: str | None = None, bytes_data: bytes | None = None) -> None:
        """Handle incoming WebSocket messages with proper error handling."""
        try:
            if not text_data:
                await self._close_with_error("No text data provided", self.CLOSE_CODES['INVALID_DATA'])
                return

            try:
                payload = json.loads(text_data)
            except json.JSONDecodeError:
                await self._close_with_error("Invalid JSON data", self.CLOSE_CODES['INVALID_DATA'])
                return

            if not (token := payload.get("token")):
                await self._close_with_error("No token provided", self.CLOSE_CODES['POLICY_VIOLATION'])
                return

            try:
                self.user = await self._authenticate_user(token)
            except rest_framework.exceptions.AuthenticationFailed as e:
                await self._close_with_error(f"Authentication failed: {str(e)}", self.CLOSE_CODES['POLICY_VIOLATION'])
                return

            if not self.user:
                await self._close_with_error("User not found", self.CLOSE_CODES['POLICY_VIOLATION'])
                return

    async def _heartbeat(self) -> None:
        """Send periodic heartbeat to keep connection alive."""
        while self.is_connected:
            try:
                await self.send(json.dumps({"type": "heartbeat"}))
                await asyncio.sleep(self.HEARTBEAT_INTERVAL)
            except Exception as e:
                logger.error(f"Heartbeat error: {e}")
                break

    async def _authenticate_user(self, token: str) -> Optional[Any]:
        """Authenticate user from JWT token."""
        token_auth = JWTAuthentication()
        try:
            validated_token = token_auth.get_validated_token(token.encode())
            return await database_sync_to_async(token_auth.get_user)(validated_token)
        except rest_framework.exceptions.AuthenticationFailed as e:
            logger.warning(f"Authentication failed: {e}")
            raise

    async def _close_with_error(self, message: str, code: int) -> None:
        """Close connection with error message and code."""
        try:
            await self.send(json.dumps({
                "type": "error",
                "message": message
            }))
        except Exception as e:
            logger.error(f"Error sending close message: {e}")
        finally:
            await self.close(code=code)

    async def _cleanup_resources(self) -> None:
        """Clean up any active resources."""
        if self.active_response:
            try:
                await self.active_response.aclose()
            except Exception as e:
                logger.error(f"Error cleaning up response: {e}")
            self.active_response = None

            try:
                buddy = await buddies.models.Buddy.objects.aget(
                    public_id=self.scope["url_route"]["kwargs"]["public_id"]
                )
            except buddies.models.Buddy.DoesNotExist:
                await self._close_with_error("Buddy not found", self.CLOSE_CODES['POLICY_VIOLATION'])
                return

            try:
                serializer = buddies.serializers.BuddyQuerySerializer(data=payload)
                await database_sync_to_async(serializer.is_valid)(raise_exception=True)

                validated_data = serializer.validated_data
                nodes = validated_data.get("nodes")
                level = validated_data.get("level")
                message = validated_data.get("message") or ""

                messages = await database_sync_to_async(buddy._get_messages)(level, nodes, message)

            try:
                self.active_response = await llms.utils.get_async_openai_client().chat.completions.create(
                    model=buddy.model,
                    messages=messages,
                    stream=True,
                    timeout=180,
                )

                try:
                    async for chunk in self.active_response:
                        if not self.is_connected:
                            logger.info("Connection closed, stopping response streaming")
                            break

                        try:
                            if (chunk_content := chunk.choices[0].delta.content) is not None:
                                await self.send(json.dumps({
                                    "type": "message",
                                    "content": chunk_content
                                }))
                        except (IndexError, KeyError, AttributeError) as e:
                            if isinstance(e, (IndexError, KeyError)):
                                continue
                            logger.warning(
                                f"Unexpected chunk format: {e}",
                                exc_info=True
                            )
                            continue

                except Exception as e:
                    logger.error(f"Error streaming response: {e}", exc_info=True)
                    await self._close_with_error(
                        "Error processing response stream",
                        self.CLOSE_CODES['INTERNAL_ERROR']
                    )
                    return
                finally:
                    await self._cleanup_resources()

                await self.close(code=self.CLOSE_CODES['NORMAL_CLOSURE'])

            except Exception as e:
                logger.error(f"Unhandled error in message processing: {e}", exc_info=True)
                await self._close_with_error(
                    "Internal server error",
                    self.CLOSE_CODES['INTERNAL_ERROR']
                )
