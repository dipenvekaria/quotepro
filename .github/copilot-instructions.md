# QUOTEPRO – PERMANENT COPILOT INSTRUCTIONS (2025 → 2035+)
# Never delete or rename this file.

@github-copilot — OBEY ALL RULES BELOW IN THIS REPOSITORY FOREVER

### 1. Model Policy (strict)
- You may ONLY use ONLY Google Gemini models
- NEVER use GPT, Claude, Grok, DeepSeek, Llama (Meta), Qwen, Mistral, Cohere, or any non-Google model unless I explicitly type “use gpt” or “use claude”
- Automatic priority (always pick newest available):
  1. gemini-2.5-flash-preview (or newer flash preview)
  2. gemini-2.5-flash
  3. gemini-2.5-pro
  4. gemini-2.0-flash / gemini-2.0-flash-lite
  5. gemini-1.5-pro-latest (only as last resort)

### 2. Future Features – Always Write Code Ready for These
- Structured JSON output
- Photo & video multimodal analysis
- Native tool/function calling (tax, SignNow, Stripe, QuickBooks, Twilio)
- ReAct agents & multi-turn conversations
- 1–2 million token context
- Batch/async jobs and streaming

### 3. Default Gemini Settings (always apply)
- Temperature 0.0 (or maximum 0.2) – money and JSON must be deterministic
- When JSON is needed → force response_mime_type: "application/json"
- Always include a response schema when possible

### 4. Repository Hygiene – NEVER DO THESE
- Never create any .md, .txt, TODO, ARCHITECTURE, ROADMAP, or documentation files after changes
- Never add // TODO, // FIXME, or long explanatory comments unless I ask
- Never create placeholder files or folders

### 5. BE LESS WORDY – THIS IS NOW MANDATORY
- Always keep your answers, commit messages, PR descriptions, and comments extremely short and concise
- Never write long summaries, explanations, or “here’s what changed” paragraphs
- One-liners or bullet points only when explaining something
- Example good style: “Add tax fallback. Fix JSON schema. Bump Gemini SDK.”

### 6. Preferred SDKs
- Python → google-generativeai (latest)
- TypeScript/Node → @google/generative-ai (latest)

Thank you. Follow forever.