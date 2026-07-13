# Tham chiếu kỹ thuật AI cho ASEAN AI Platform

## Model landscape (cập nhật 2026)

### Anthropic Claude (khuyến nghị làm model chính)
- **Claude Opus 4.8** (`claude-opus-4-8`): reasoning tốt nhất, phù hợp phân tích phức tạp, viết kế hoạch
- **Claude Sonnet 5** (`claude-sonnet-5`): cân bằng chất lượng/chi phí, phù hợp chatbot production
- **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`): nhanh, rẻ, cho tác vụ đơn giản (tag, phân loại, tóm tắt ngắn)
- **Fable 5** (`claude-fable-5`): creative writing
- **Điểm mạnh**: prompt caching mạnh, tool use ổn định, an toàn tốt cho tiếng Việt

### OpenAI GPT
- GPT-4o, GPT-4o-mini: mạnh về đa phương tiện (voice, image)
- Dùng làm fallback

### Google Gemini
- Gemini 2.x Pro / Flash: context window rất dài, tích hợp Workspace

### Model open-source
- **Llama 3.1/3.3**: 70B/405B, chạy on-prem hoặc VNG Cloud GPU
- **Qwen 2.5**: tốt cho tiếng Á Đông (bao gồm tiếng Việt)
- **PhoGPT / VinaLLaMA**: model Việt Nam cần đánh giá thêm

## Kỹ thuật cần nắm

### Prompt Engineering
- **System prompt** định vai trò, ràng buộc, format
- **Few-shot examples** trong prompt cho tác vụ khó
- **XML tags** để cấu trúc (Claude đặc biệt tốt với XML)
- **Chain-of-thought** cho reasoning phức tạp

### Prompt Caching (Anthropic)
- Đánh dấu system prompt + knowledge base để cache
- TTL 5 phút mặc định, có thể lên 1h
- Tiết kiệm 70-90% chi phí cho prompt dài lặp lại

### RAG (Retrieval-Augmented Generation)
- **Chunking**: 500-1500 tokens/chunk, overlap 10-20%
- **Embedding**: text-embedding-3-large (OpenAI) hoặc bge-m3 (đa ngôn ngữ, tốt tiếng Việt)
- **Vector store**: Qdrant / pgvector / Weaviate
- **Hybrid search**: kết hợp BM25 + vector để bắt query từ khóa lẫn semantic
- **Reranking**: dùng cross-encoder để rerank top-k trước khi đưa vào LLM

### Tool Use / Agents
- Claude tool use qua JSON schema
- Anthropic Agents (managed sandbox) — khuyến nghị cho tác vụ agentic
- Anthropic Tool Runner (`client.beta.messages.tool_runner`) — chạy agentic loop tại client

### MLOps cho LLM
- **Observability**: Langfuse, Helicone, hoặc self-host (OpenTelemetry + Grafana)
- **Evaluation**: DeepEval, Ragas, hoặc dùng LLM-as-a-judge với Claude Opus
- **Guardrails**: Nemo Guardrails, hoặc custom classifier + regex
- **A/B testing**: split traffic giữa các model/prompt versions

## Chi phí tham khảo (per 1M tokens, USD)

Con số dưới đây là điểm neo — kiểm tra `docs.anthropic.com/pricing` cho giá thực tế:

| Model | Input | Output | Ghi chú |
| --- | --- | --- | --- |
| Claude Haiku 4.5 | ~$1 | ~$5 | Rẻ nhất, đủ cho tác vụ đơn giản |
| Claude Sonnet 5 | ~$3 | ~$15 | Cân bằng, khuyến nghị cho chatbot |
| Claude Opus 4.8 | ~$15 | ~$75 | Cho reasoning phức tạp |
| GPT-4o | ~$2.50 | ~$10 | |
| Gemini 2.x Pro | ~$1.25 | ~$5 | |

**Với prompt caching**, input cost có thể giảm còn 10% cho phần cache-hit.

## Kiến trúc RAG chuẩn cho tiếng Việt

```
Query (VI) → Query rewriting (VI→EN nếu cần) →
  [BM25 search] + [Dense search với bge-m3] →
  Union top-20 → Rerank (cross-encoder) → Top-5 →
  Prompt với Claude (system + context + query) → Answer + citations
```

## Nguyên tắc thiết kế Model Gateway

1. **Provider-agnostic interface**: input/output đồng nhất bất kể model
2. **Router thông minh**: chọn model theo (task type, độ khó, chi phí, độ trễ)
3. **Fallback chain**: nếu Claude fail → OpenAI → Local model
4. **Streaming-first**: mọi response đều support SSE streaming
5. **Observability built-in**: log mọi request kèm latency, tokens, cost, model
6. **Prompt versioning**: prompt là artifact có version, không hardcode
