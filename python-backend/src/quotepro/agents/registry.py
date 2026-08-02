"""AgentRegistry — loads agent definitions from `config/agents.yaml`.

Each entry names a prompt file, a model, tools, and (optionally) an output
schema. A single `build()` returns a configured ADK `LlmAgent` ready to run.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable

import yaml

from quotepro.core.config import get_settings
from quotepro.core.errors import ConfigError
from quotepro.core.logging import get_logger

if TYPE_CHECKING:
    from google.adk.agents import LlmAgent  # pragma: no cover

log = get_logger(__name__)


@dataclass(frozen=True)
class AgentSpec:
    name: str
    description: str
    prompt_file: str
    model: str
    temperature: float
    tools: list[str]
    output_schema: str | None = None


class AgentRegistry:
    """Lazy loader for agent definitions."""

    def __init__(self, *, config_path: Path, prompts_dir: Path) -> None:
        self.config_path = config_path
        self.prompts_dir = prompts_dir
        self._specs: dict[str, AgentSpec] | None = None
        self._agents: dict[str, Any] = {}

    def _load(self) -> dict[str, AgentSpec]:
        if self._specs is not None:
            return self._specs
        if not self.config_path.exists():
            raise ConfigError(f"agents.yaml not found at {self.config_path}")
        raw = yaml.safe_load(self.config_path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict) or "agents" not in raw:
            raise ConfigError("agents.yaml must have a top-level `agents:` key")
        specs: dict[str, AgentSpec] = {}
        for entry in raw["agents"]:
            spec = AgentSpec(
                name=entry["name"],
                description=entry.get("description", ""),
                prompt_file=entry["prompt_file"],
                model=entry.get("model", get_settings().gemini_model_default),
                temperature=float(entry.get("temperature", get_settings().ai_temperature)),
                tools=list(entry.get("tools") or []),
                output_schema=entry.get("output_schema"),
            )
            specs[spec.name] = spec
        self._specs = specs
        log.info("agent_registry_loaded", count=len(specs), names=list(specs.keys()))
        return specs

    def get_spec(self, name: str) -> AgentSpec:
        specs = self._load()
        if name not in specs:
            raise ConfigError(f"Agent '{name}' not declared in agents.yaml")
        return specs[name]

    def _load_prompt(self, prompt_file: str) -> str:
        path = self.prompts_dir / prompt_file
        if not path.exists():
            raise ConfigError(f"Prompt file not found: {path}")
        return path.read_text(encoding="utf-8")

    def build(
        self,
        name: str,
        *,
        tool_registry: dict[str, Callable[..., Any]] | None = None,
    ) -> "LlmAgent":
        """Build (or return cached) LlmAgent."""
        if name in self._agents:
            return self._agents[name]

        spec = self.get_spec(name)
        prompt = self._load_prompt(spec.prompt_file)

        from google.adk.agents import LlmAgent
        from google.adk.models import Gemini

        model = Gemini(
            model=spec.model,
            api_key=get_settings().gemini_api_key.get_secret_value(),
        )

        tool_map = tool_registry or _default_tool_registry()
        tools = [tool_map[t] for t in spec.tools if t in tool_map]

        # Resolve output schema (Pydantic class) if declared
        output_schema_cls = None
        if spec.output_schema:
            from quotepro.db.schemas import SCHEMA_REGISTRY

            output_schema_cls = SCHEMA_REGISTRY.get(spec.output_schema)
            if output_schema_cls is None:
                raise ConfigError(
                    f"Agent '{name}' references unknown output_schema '{spec.output_schema}'"
                )

        agent_kwargs: dict[str, Any] = {
            "model": model,
            "name": spec.name,
            "description": spec.description,
            "instruction": prompt,
            "tools": tools,
        }
        if output_schema_cls is not None:
            agent_kwargs["output_schema"] = output_schema_cls

        agent = LlmAgent(**agent_kwargs)
        self._agents[name] = agent
        return agent

    def clear_cache(self) -> None:
        self._agents.clear()
        self._specs = None


def _default_tool_registry() -> dict[str, Any]:
    """Central lookup: tool-name → callable. Extend here when adding tools."""
    from quotepro.tools.pricing import get_tax_rate, recalculate_discount
    from quotepro.tools.rag import retrieve_catalog_items, retrieve_similar_quotes

    return {
        "retrieve_catalog_items": retrieve_catalog_items,
        "retrieve_similar_quotes": retrieve_similar_quotes,
        "get_tax_rate": get_tax_rate,
        "recalculate_discount": recalculate_discount,
    }


@lru_cache(maxsize=1)
def get_registry() -> AgentRegistry:
    """Cached registry rooted at `python-backend/config/agents.yaml`."""
    root = Path(__file__).resolve().parents[3]
    return AgentRegistry(
        config_path=root / "config" / "agents.yaml",
        prompts_dir=Path(__file__).resolve().parents[1] / "prompts",
    )
