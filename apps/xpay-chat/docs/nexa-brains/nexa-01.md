# Nexa Brain Snapshot: nexa-01

Created: 2026-05-29 23:20 Asia/Ho_Chi_Minh

## Purpose

This snapshot preserves the current XPAY AI brain before resetting provider settings.

## Source State

- Git commit: `6f042d2f81cf56db992dc79ceb6782c69bdaf5b8`
- Behavior template: `nexa-twin-custom-gpt-v2`
- Agency agent pack: enabled
- Agency agent count: 184
- Knowledge pack: `docs/nexa-twin-knowledge/NexaTwinAI_Knowledge_Pack.md`
- Runtime provider mode before reset: `AI_PROVIDER=groq`, `AI_EXTERNAL_MODE=auto`, `AI_CHAIN_FALLBACKS=1`
- Primary external provider before reset: Groq `llama-3.1-8b-instant`
- Fallback providers before reset: Z.AI `glm-4.7`, Ollama local models, Gemini/OpenAI-compatible when configured

## Preserved Components

- Core AI orchestration and fallback logic in `server.js`
- XPAY Twin behavior policy and safety rules
- Reminder/calendar intent handling
- Context-aware follow-up handling
- Sensitive data redaction rules
- Agency agent selection and summaries
- Live-info fallback policy
- Local model privacy fallback via Ollama

## Integrity Hashes

- `server.js`: `f8b740c499ee8dd2edac9207b68421d03330675f4df2b58ec052c74dfe238d3c`
- `data/nexa-agency-agent-pack.json`: `2aa788cc142e833f9cbec2f1eca156ee8c802329318d1a1506fdfd4c26eff109`
- `docs/nexa-twin-knowledge/NexaTwinAI_Knowledge_Pack.md`: `195e733e9723e266834dbce63ab473f5c40b12e5f9403296222846d0523ff37b`
- `deploy/xpaychat.env.example`: `9ffaabe02b5dfabbf43cb44eab32fb3d2efc430b137d91ce54b4b8be491e9525`

## Secret Handling

API keys are intentionally not stored in this snapshot. Restore keys only from the VPS secret environment files or a secure key manager.
