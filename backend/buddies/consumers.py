import json

import openai
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings

import buddies.models
import buddies.serializers


class QueryConsumer(AsyncWebsocketConsumer):
    """The same functionality as views/BuddyModelViewSet.query, but as a WebSocket consumer."""

    async def connect(self) -> None:
        if not self.scope["user"].is_authenticated:
            await self.close(code=403)
            return
        try:
            self.buddy = await buddies.models.Buddy.objects.aget(
                public_id=self.scope["url_route"]["kwargs"]["public_id"]
            )
        except buddies.models.Buddy.DoesNotExist:
            await self.close(code=404)
        else:
            await self.accept()

    async def receive(self, text_data: str | None = None, bytes_data: bytes | None = None) -> None:
        if text_data is None:
            return

        serializer = buddies.serializers.BuddyQuerySerializer(data=json.loads(text_data))
        await sync_to_async(serializer.is_valid)(raise_exception=True)
        validated_data = serializer.validated_data
        nodes = validated_data.get("nodes")
        level = validated_data.get("level")
        message = validated_data.get("message") or ""

        messages = await sync_to_async(self.buddy._get_messages)(level, nodes, message)

        response = await openai.AsyncClient(
            api_key=settings.OPENAI_API_KEY
        ).chat.completions.create(
            model=self.buddy.model,
            messages=messages,
            stream=True,
            timeout=180,
        )

        async for chunk in response:
            chunk_content = chunk.choices[0].delta.content
            if chunk_content is not None:
                await self.send(chunk_content)
