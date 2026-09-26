# AI-Powered Knowledge Base

A full-stack, enterprise-grade Knowledge Base application where users manage documents and query them through an AI chat interface powered by **Retrieval-Augmented Generation (RAG)**, **Supabase pgvector**, and a **Provider-Agnostic AI Architecture**.

Built for the **Goodspeed Software Developer Technical Assessment**.

---

## 📽️ Loom Walkthrough Videos
- **Application Walkthrough (<= 5 mins):** [Loom Link Here - App Walkthrough](https://loom.com/share/placeholder-app-demo)
- **AI Acceleration Walkthrough:** [Loom Link Here - AI Workflow](https://loom.com/share/placeholder-ai-demo)

---

## 🛠️ Tech Stack Overview

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Monorepo** | Turborepo + npm Workspaces | Fast incremental builds, shared packages (`@kb/types`, `@kb/tsconfig`), unified DX |
| **Frontend** | Next.js 15 (App Router) + React 19 + Tailwind CSS | Fast SSR/CSR, responsive modern UI, Server-Sent Events (SSE) streaming support |
| **Backend API** | NestJS 10 + TypeScript | Enterprise modularity, dependency injection, validation pipes, Swagger/OpenAPI |
| **Database** | Supabase (PostgreSQL + pgvector) | Robust relational storage + native HNSW vector cosine similarity search + RLS |
| **AI Layer** | OpenAI SDK (Provider-Agnostic) | Swappable AI strategy pattern (OpenAI, Groq, Together, OpenRouter, Ollama) |

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- **Node.js** >= 20.0.0
- A **Supabase** project (free tier works great)
- An API key for your chosen AI provider (OpenAI, Groq, OpenRouter, or a local Ollama instance)

### 2. Clone and Install
```bash
git clone <repository-url>
cd Project
npm install
```

### 3. Database Setup (Supabase)
1. Go to your Supabase project dashboard -> **SQL Editor**.
2. Open the file [`supabase/schema.sql`](supabase/schema.sql) in this repository.
3. Paste and run the entire SQL script.
   - Enables `uuid-ossp` and `vector` extensions.
   - Creates `documents`, `document_chunks`, `conversations`, and `messages` tables.
   - Sets up high-performance **HNSW vector indexes**.
   - Applies strict **Row Level Security (RLS)** policies so users can only access their own data.
   - Installs the `match_document_chunks` RPC function for vector similarity searches.

### 4. Configure Environment Variables
Copy the example files:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Fill in your credentials:
- In `apps/api/.env`: Add your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and AI Provider credentials.
- In `apps/web/.env.local`: Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 5. Run the Application
Start the full stack with a single command:
```bash
npm run dev
```

- **Web Frontend**: [http://localhost:3000](http://localhost:3000)
- **NestJS API**: [http://localhost:4000/api](http://localhost:4000/api)
- **Interactive Swagger Docs**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## 🧠 Architectural Decisions & Design Rationale

### 1. Provider-Agnostic AI Layer (Key Requirement)
Rather than hardcoding OpenAI endpoints, the application implements an `IAiProvider` interface backed by `OpenAiCompatibleProvider`. Because standard providers (Groq, Together AI, OpenRouter, Ollama) conform to the OpenAI REST specification (`/v1/chat/completions` and `/v1/embeddings`), any model or provider can be swapped purely via environment variables:
- **Decoupled Chat & Embedding Endpoints**: Groq is 10x faster for LLM chat completion but does not host embedding endpoints. Our architecture lets you configure `AI_CHAT_BASE_URL` pointing to Groq and `AI_EMBEDDING_BASE_URL` pointing to OpenAI or Ollama seamlessly.
- **Local / Air-Gapped Ready**: You can point both chat and embedding endpoints to a local Ollama instance (`http://localhost:11434/v1`) without modifying a single line of backend logic.

### 2. Chunking Strategy & RAG Pipeline
- **Recursive Structure-Aware Chunker**: Plain character slicing destroys semantic cohesion. Our `ChunkingService` implements a recursive splitting hierarchy: Markdown headers (`#`, `##`, `###`) -> Paragraph breaks (`\n\n`) -> Bullet points (`- `) -> Sentences (`. `) -> Word boundaries.
- **Chunk Size (600 characters / ~150 tokens)**: Small enough to maintain high semantic precision for cosine retrieval without diluting specific facts.
- **Overlap (100 characters / ~25 tokens)**: Guarantees that concepts spanning the boundary of two chunks are not truncated or lost during retrieval.
- **Atomic Vector Synchronization**: When a document is updated or deleted, existing chunks are purged and re-indexed in an atomic flow, preventing orphaned vector embeddings.

### 3. Multi-Tenant Database Security (RLS)
Security is implemented at both application and database layers:
- The backend features `SupabaseAuthGuard` that extracts and validates JWT tokens directly with Supabase Auth.
- Every table has PostgreSQL Row Level Security (RLS) enabled checking `auth.uid() = user_id`.
- The `match_document_chunks` RPC function enforces `dc.user_id = p_user_id` inside the database query itself, preventing any cross-tenant data leakage during vector similarity search.

---

## 🔄 How to Swap AI Providers

Switching providers is done in `apps/api/.env` without code changes:

### Option A: Standard OpenAI (Default)
```env
AI_PROVIDER_TYPE=openai
AI_CHAT_BASE_URL=https://api.openai.com/v1
AI_CHAT_API_KEY=sk-proj-...
AI_CHAT_MODEL=gpt-4o-mini
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-proj-...
AI_EMBEDDING_MODEL=text-embedding-3-small
```

### Option B: Groq (Ultra-Fast LLM) + OpenAI Embeddings
```env
AI_PROVIDER_TYPE=groq
AI_CHAT_BASE_URL=https://api.groq.com/openai/v1
AI_CHAT_API_KEY=gsk_...
AI_CHAT_MODEL=llama-3.3-70b-versatile
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-proj-...
AI_EMBEDDING_MODEL=text-embedding-3-small
```

### Option C: 100% Free & Local with Ollama
```env
AI_PROVIDER_TYPE=ollama
AI_CHAT_BASE_URL=http://localhost:11434/v1
AI_CHAT_API_KEY=ollama
AI_CHAT_MODEL=llama3.2
AI_EMBEDDING_BASE_URL=http://localhost:11434/v1
AI_EMBEDDING_API_KEY=ollama
AI_EMBEDDING_MODEL=nomic-embed-text
AI_EMBEDDING_DIMENSION=768
```

### Option D: OpenRouter
```env
AI_PROVIDER_TYPE=openrouter
AI_CHAT_BASE_URL=https://openrouter.ai/api/v1
AI_CHAT_API_KEY=sk-or-v1-...
AI_CHAT_MODEL=anthropic/claude-3.5-haiku
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-proj-...
AI_EMBEDDING_MODEL=text-embedding-3-small
```

---

## ⭐ Implemented Stretch Goals

1. **Real-Time Token Streaming**: Chat uses Server-Sent Events (SSE) to stream assistant tokens in real time.
2. **Interactive Source Citations**: Each AI response cites the exact document title and matched text chunk with cosine similarity percentages.
3. **Persistent Conversation History**: Multi-session conversation management with conversation renaming, message history, and session deletion.
4. **File Upload / Text Extraction**: Direct client-side file upload support for `.txt`, `.md`, and `.json` documents.
5. **Active Provider Status Indicator**: Live UI badge displaying the currently active AI provider and model.

---

## 🔮 What We Would Improve With More Time

1. **Hybrid Search (Sparse + Dense)**: Combine pgvector dense cosine search with PostgreSQL full-text search (`tsvector` / BM25) using Reciprocal Rank Fusion (RRF) for optimal keyword and semantic retrieval.
2. **Async Background Ingestion Worker**: For large multi-megabyte documents, offload chunking and embedding to a background Redis/BullMQ queue with progress webhooks.
3. **Advanced PDF Extraction**: Integrate server-side OCR and layout-aware PDF parsers (e.g. `pdf-parse` or Unstructured) to retain tables and diagram captions.
4. **Context Window Token Counting**: Implement client/server `tiktoken` tracking to display real-time token usage and cost metrics per query.

---

## 📄 License
MIT License. Built for Goodspeed Technical Assessment.
