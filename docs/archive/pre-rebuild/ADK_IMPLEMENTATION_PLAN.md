# Google ADK Implementation Plan: A Future-Proof Architecture

This document outlines a phased, scalable, and maintainable approach for integrating Google's Agent Development Kit (ADK) into the platform. The architecture is designed to evolve from a single agent to a sophisticated, multi-agent system capable of handling diverse and complex tasks.

## Guiding Principles

- **Scalability:** The system must support adding new agents and tools without requiring major architectural changes.
- **Maintainability:** Agent logic, prompts, and tool definitions should be decoupled and easy to manage.
- **Observability:** Comprehensive logging and tracing are essential for debugging and monitoring agent behavior.
- **Security:** All agent actions and tool executions must be performed within the security context of the authenticated user.

---

## Phase 1: Foundational Setup (MVP - QuoteBuilder Agent)

This phase focuses on getting a single, stateful agent working end-to-end for the core quote-building task.

1.  **Dependency Installation:**
    -   Add `google-generativeai` to `python-backend/requirements.txt`.
    -   Install the dependency into the Python virtual environment.

2.  **Session Management Backend:**
    -   **Database Migration:** Create a Supabase migration for an `adk_sessions` table.
        -   Schema: `id` (PK), `user_id` (FK to `auth.users`), `session_data` (JSONB), `created_at`, `updated_at`.
        -   Enable RLS to ensure users can only access their own sessions.
    -   **Session Service (`SessionService`):** Implement a service in `python-backend/app/services/` to handle CRUD operations for agent sessions, abstracting the database interaction.

3.  **Agent & Tool Implementation:**
    -   **Tool Definition:** Define initial tools for the `QuoteBuilderAgent`. These will be Python functions that wrap existing business logic (e.g., `search_catalog`, `calculate_tax`, `get_customer_details`).
    -   **Agent Creation (`QuoteBuilderAgent`):** Create the first agent using `LlmAgent`. Its system prompt will guide it on how to build a quote by interacting with a user and using the provided tools.

4.  **API Endpoint:**
    -   Create a new FastAPI endpoint: `POST /api/v1/adk/chat`.
    -   This endpoint will:
        1.  Authenticate the user.
        2.  Load or create a session using the `SessionService`.
        3.  Instantiate the `QuoteBuilderAgent`.
        4.  Use the ADK `Runner` to process the user's message.
        5.  Save the updated session state.
        6.  Return the agent's response to the frontend.

5.  **Frontend Integration:**
    -   Integrate the new `/api/v1/adk/chat` endpoint into the quote creation/editing interface to provide a conversational AI experience.

---

## Phase 2: Multi-Agent Architecture

This phase evolves the system to support multiple specialized agents, orchestrated by a central router.

1.  **Configuration Management:**
    -   Create a `python-backend/config/agents.yaml` file.
    -   This file will define each agent's `name`, `description` (for the router), `system_prompt`, `model_configuration`, and the list of `tools` it can use.
    -   This externalizes agent configuration, allowing for updates without code changes.

2.  **Tool & Agent Registry:**
    -   **Tool Registry:** Implement a centralized registry that dynamically loads all available tool functions from a dedicated directory (e.g., `python-backend/app/agents/tools/`).
    -   **Agent Factory:** Create a factory function that reads the `agents.yaml` config and instantiates the requested agents, attaching the correct tools from the registry.

3.  **Router Agent (`RouterAgent`):**
    -   Create a top-level `RouterAgent`.
    -   Its purpose is to analyze the user's request and delegate the task to the most appropriate specialized agent (e.g., `QuoteBuilderAgent`, `JobNamerAgent`, `ProductCatalogAgent`).
    -   The API endpoint will now use the `RouterAgent` as the entry point.

4.  **RAG as a Tool:**
    -   Wrap the existing `pgvector`-based RAG service (`match_documents` RPC) into a `knowledge_base_search` tool.
    -   Add this tool to the `agents.yaml` configuration for any agent that requires access to long-term memory or documentation.

---

## Phase 3: Hardening & Advanced Features

This phase focuses on making the system robust, observable, and ready for production scale.

1.  **Observability & Structured Logging:**
    -   Implement structured logging for all agent interactions.
    -   For each turn, log: `session_id`, `user_id`, `agent_used`, `user_input`, `agent_response`, `tools_called`, `tool_inputs`, `tool_outputs`, and `llm_latency`.
    -   Consider integrating with a tracing framework like OpenTelemetry for visualizing agent execution flows.

2.  **Testing Strategy:**
    -   **Unit Tests:** Test individual tools in isolation.
    -   **Integration Tests:** Test agents with their mocked tools to verify logic.
    -   **End-to-End (E2E) Tests:** Create test scripts that simulate user conversations and assert the final outcomes (e.g., a correctly generated quote JSON).

3.  **Security Hardening:**
    -   Ensure the security context (user ID, organization ID) is passed down from the API layer to every tool execution.
    -   Implement strict validation on all tool inputs to prevent injection-style attacks.

4.  **Asynchronous Tool Execution (Future):**
    -   Design a pattern for handling long-running tools.
    -   This could involve the tool returning an immediate `task_id`, and the agent using a `check_task_status` tool to poll for completion. This prevents API timeouts and improves user experience for complex, time-intensive operations.
