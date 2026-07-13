"""Wrapper quanh Anthropic SDK, tập trung logging và cấu hình chung."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from anthropic import AsyncAnthropic

from app.core.config import Settings, get_settings


class ClaudeClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        if not self.settings.anthropic_api_key:
            self._client: AsyncAnthropic | None = None
        else:
            self._client = AsyncAnthropic(api_key=self.settings.anthropic_api_key)

    @property
    def is_ready(self) -> bool:
        return self._client is not None

    def _require(self) -> AsyncAnthropic:
        if self._client is None:
            raise RuntimeError(
                "ANTHROPIC_API_KEY chưa được cấu hình. "
                "Sao chép .env.example thành .env và thêm khóa hợp lệ."
            )
        return self._client

    async def complete(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float = 0.4,
        tools: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        client = self._require()
        response = await client.messages.create(
            model=model or self.settings.anthropic_model_main,
            max_tokens=max_tokens or self.settings.anthropic_max_tokens,
            temperature=temperature,
            system=system,
            messages=messages,
            tools=tools or [],
        )
        text_parts = [
            block.text for block in response.content if getattr(block, "type", None) == "text"
        ]
        return {
            "text": "".join(text_parts),
            "stop_reason": response.stop_reason,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            },
            "model": response.model,
        }

    async def stream(
        self,
        *,
        system: str,
        messages: list[dict[str, Any]],
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float = 0.4,
    ) -> AsyncIterator[str]:
        client = self._require()
        async with client.messages.stream(
            model=model or self.settings.anthropic_model_main,
            max_tokens=max_tokens or self.settings.anthropic_max_tokens,
            temperature=temperature,
            system=system,
            messages=messages,
        ) as stream:
            async for chunk in stream.text_stream:
                yield chunk
