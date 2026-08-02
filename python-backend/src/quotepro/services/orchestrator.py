"""Orchestrator — invoke ADK agents with durable Postgres sessions.

Replaces the pre-rebuild `AdkQuoteService`. Runs any registered agent,
handles company/user context propagation into tools, parses structured
JSON output, and logs cost to `ai_conversations`.
"""

from __future__ import annotations

import json
import time
from typing import Any
from uuid import UUID, uuid4

from quotepro.agents.registry import get_registry
from quotepro.core.errors import AgentError
from quotepro.core.logging import get_logger
from quotepro.services.ai_client import log_conversation
from quotepro.services.sessions import PostgresSessionService
from quotepro.tools.rag import set_company_context

log = get_logger(__name__)


class AgentOrchestrator:
    """Runs any registered agent, with Postgres-backed session state."""

    def __init__(self) -> None:
        self.session_service = PostgresSessionService()

    async def run(
        self,
        *,
        agent_name: str,
        prompt: str,
        company_id: str | UUID,
        user_id: str | UUID | None,
        session_id: str | None = None,
        entity_type: str | None = None,
        entity_id: str | UUID | None = None,
    ) -> tuple[str, str]:
        """Run an agent turn.

        Returns:
            (raw_text_response, session_id_used)
        """
        from google.adk import Runner
        from google.genai import types

        set_company_context(str(company_id))
        sid = session_id or str(uuid4())
        uid = str(user_id) if user_id else "system"
        app_name = "quotepro"

        session = await self.session_service.get_session(app_name, uid, sid)
        if session is None:
            await self.session_service.create_session(app_name, uid, sid)

        agent = get_registry().build(agent_name)
        runner = Runner(agent=agent, app_name=app_name, session_service=self.session_service)

        message = types.Content(role="user", parts=[types.Part(text=prompt)])

        start = time.perf_counter()
        final_response = ""
        tokens_in = 0
        tokens_out = 0
        try:
            async for event in runner.run_async(
                user_id=uid,
                session_id=sid,
                new_message=message,
            ):
                if event.is_final_response() and event.content and event.content.parts:
                    final_response = event.content.parts[0].text or ""
                    break
        except Exception as e:
            latency_ms = int((time.perf_counter() - start) * 1000)
            log_conversation(
                company_id=company_id,
                user_id=user_id,
                agent_name=agent_name,
                model=get_registry().get_spec(agent_name).model,
                purpose="agent_run",
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                latency_ms=latency_ms,
                entity_type=entity_type,
                entity_id=entity_id,
                status="error",
                error_message=str(e),
            )
            raise AgentError(f"Agent '{agent_name}' failed: {e}") from e

        latency_ms = int((time.perf_counter() - start) * 1000)

        if not final_response:
            log_conversation(
                company_id=company_id,
                user_id=user_id,
                agent_name=agent_name,
                model=get_registry().get_spec(agent_name).model,
                purpose="agent_run",
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                latency_ms=latency_ms,
                entity_type=entity_type,
                entity_id=entity_id,
                status="error",
                error_message="empty response",
            )
            raise AgentError(f"Agent '{agent_name}' returned an empty response.")

        log_conversation(
            company_id=company_id,
            user_id=user_id,
            agent_name=agent_name,
            model=get_registry().get_spec(agent_name).model,
            purpose="agent_run",
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            latency_ms=latency_ms,
            entity_type=entity_type,
            entity_id=entity_id,
            status="success",
        )
        return final_response, sid

    @staticmethod
    def parse_json(raw: str) -> dict[str, Any]:
        """Robust JSON extraction — handles markdown-fenced responses."""
        raw = raw.strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
        if "```json" in raw:
            candidate = raw.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in raw:
            candidate = raw.split("```", 1)[1].split("```", 1)[0].strip()
        else:
            candidate = raw
        try:
            return json.loads(candidate)
        except json.JSONDecodeError as e:
            raise AgentError(f"Failed to parse agent JSON: {e}\nRaw: {raw[:200]}") from e


_singleton: AgentOrchestrator | None = None


def get_orchestrator() -> AgentOrchestrator:
    global _singleton
    if _singleton is None:
        _singleton = AgentOrchestrator()
    return _singleton
