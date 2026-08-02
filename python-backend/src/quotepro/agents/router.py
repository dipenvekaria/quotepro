"""RouterAgent — inspects user intent and delegates to specialist sub-agents.

Phase 2 ships the routing pattern with a single specialist (`quote_builder`).
Phase 4 fleshes out the sub-agent tree.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from quotepro.agents.registry import get_registry

if TYPE_CHECKING:  # pragma: no cover
    from google.adk.agents import LlmAgent


def create_router() -> "LlmAgent":
    return get_registry().build("router")
