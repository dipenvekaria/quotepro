"""QuoteBuilder — main agent for generating quotes from natural-language descriptions.

Loaded via `AgentRegistry.build('quote_builder')`. This module exists so
tests can import a factory directly without touching YAML.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from quotepro.agents.registry import get_registry

if TYPE_CHECKING:  # pragma: no cover
    from google.adk.agents import LlmAgent


def create_quote_builder() -> "LlmAgent":
    return get_registry().build("quote_builder")
