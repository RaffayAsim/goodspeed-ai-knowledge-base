# AI-Powered Knowledge Base (RAG)

An enterprise-grade, full-stack AI Knowledge Base built with **Next.js 15**, **NestJS 10**, **Supabase (PostgreSQL + pgvector)**, and a **Provider-Agnostic AI Layer**. Users can create and manage documents, upload files (PDF, DOCX, CSV, TXT, MD), and converse with an AI assistant that retrieves relevant context via vector similarity search, streams responses in real time, and tracks token usage.

Built for the **Goodspeed Software Developer Technical Assessment**.

---

## 📽️ Loom Walkthrough Videos
- **Application Walkthrough (<= 5 mins):** [Loom Link Here - App Walkthrough](https://loom.com/share/placeholder-app-demo)
- **AI Acceleration Walkthrough:** [Loom Link Here - AI Workflow](https://loom.com/share/placeholder-ai-demo)

---

## 🌟 Key Features & Highlights

- **Turborepo Monorepo Architecture**: Clean separation between `apps/web` (Next.js frontend), `apps/api` (NestJS backend), and shared packages (`@kb/types`, `@kb/tsconfig`).
- **Provider-Agnostic AI Strategy**: Designed so any provider conforming to the OpenAI standard specification can be swapped via configuration without touching application code (Google Gemini, OpenAI, Groq, Together AI, OpenRouter, Ollama).
- **Hybrid RAG Pipeline**: Recursive structure-aware document chunking, 1536-dimensional vector embeddings, and accelerated HNSW cosine similarity search via Supabase pgvector.
- **WhatsApp-Style Conversational UX**: Real-time Server-Sent Events (SSE) streaming, animated bouncing-dot typing indicators, message delivery status receipts, and 1-click response copying.
- **Document-Grouped Citations**: Retrieved sources are grouped by document title with distinct semantic chunk pills (`Part 1`, `Part 4`), match percentages, and modal excerpt viewers.
- **Token & Usage Tracking Dashboard**: Real-time token tracking per message and a dedicated analytics dashboard at `/usage` displaying cumulative tokens, prompt vs. completion ratios, and RAG metrics.
- **Multi-Format Document Extraction**: Client and server file upload pipelines supporting `.pdf`, `.docx`, `.csv`, `.txt`, and `.md`.
- **Strict Multi-Tenant Security**: Supabase JWT authentication coupled with PostgreSQL Row Level Security (RLS) on all tables and database-level user isolation inside the pgvector RPC search function.

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Monorepo** | Turborepo + npm Workspaces | Fast incremental builds, unified task orchestration, shared types (`@kb/types`) |
| **Frontend** | Next.js 15 (App Router) + React 19 + Tailwind CSS | React Server Components, responsive glassmorphism aesthetic, SSE streaming support |
| **Backend API** | NestJS 10 + TypeScript | Enterprise modularity, dependency injection, DTO validation pipes, Swagger/OpenAPI |
| **Database** | Supabase (PostgreSQL + pgvector) | Relational integrity, native HNSW vector index, Row Level Security (RLS) policies |
| **AI Layer** | OpenAI SDK (Provider-Agnostic Abstraction) | Swappable strategy pattern supporting OpenAI, Groq, Gemini, OpenRouter, Ollama |

---

## 🚀 Quickstart & Setup Instructions

Follow these steps to run the complete project locally.

### 1. Prerequisites
- **Node.js** `>= 20.0.0`
- **npm** `>= 10.0.0`
- A **Supabase** project (free tier with pgvector enabled)
- An API key for your chosen AI provider (Google Gemini, OpenAI, Groq, or local Ollama)

### 2. Clone the Repository
```bash
git clone https://github.com/RaffayAsim/goodspeed-ai-knowledge-base.git
cd goodspeed-ai-knowledge-base
npm install
```

### 3. Database Schema Setup (Supabase)
1. Open your Supabase project dashboard -> **SQL Editor**.
2. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Paste and run the script in the SQL Editor.
   - Enables `uuid-ossp` and `vector` extensions.
   - Creates `documents`, `document_chunks`, `conversations`, and `messages` tables.
   - Builds high-performance **HNSW indexes** (`vector_cosine_ops`).
   - Applies strict **Row Level Security (RLS)** policies to ensure users only access their own records.
   - Installs the `match_document_chunks` RPC function for cosine similarity vector search.

### 4. Configure Environment Variables
Create the environment configuration files from the blueprints:

**Backend API (`apps/api/.env`):**
```bash
cp apps/api/.env.example apps/api/.env
```
Ensure the following variables are set:
```env
PORT=4000
NODE_ENV=development

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Swappable AI Provider Configuration
AI_PROVIDER_TYPE=gemini # options: openai | gemini | groq | openrouter | ollama

# Chat Completion Settings (OpenAI-compatible)
AI_CHAT_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_CHAT_API_KEY=your-api-key
AI_CHAT_MODEL=gemini-3.8-flash
AI_CHAT_TEMPERATURE=0.3
AI_CHAT_MAX_TOKENS=1500

# Embedding Settings (1536 dimensions)
AI_EMBEDDING_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_EMBEDDING_API_KEY=your-api-key
AI_EMBEDDING_MODEL=gemini-embedding-001
AI_EMBEDDING_DIMENSION=1536

# RAG Hyperparameters
RAG_TOP_K=4
RAG_SIMILARITY_THRESHOLD=0.25
RAG_CHUNK_SIZE=600
RAG_CHUNK_OVERLAP=100
```

**Frontend Web (`apps/web/.env.local`):**
```bash
cp apps/web/.env.example apps/web/.env.local
```
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 5. Run the Application
Start both the NestJS API and Next.js frontend concurrently:
```bash
npm run dev
```

- **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
- **NestJS REST API**: [http://localhost:4000/api](http://localhost:4000/api)
- **Interactive Swagger Docs**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

To test the RAG pipeline and chat streaming via automated script:
```bash
node scripts/test-api-chat.cjs
```

---

## 🧠 Architectural Decisions & Design Rationale

### 1. Provider-Agnostic AI Abstraction Layer
- **Interface Segregation**: Defined the `IAiProvider` TypeScript interface in [`apps/api/src/ai-provider/ai-provider.interface.ts`](apps/api/src/ai-provider/ai-provider.interface.ts). All chat generation, streaming, and embedding methods are invoked exclusively through this contract.
- **OpenAI Standard Interoperability**: Modern inference providers (Groq, Together AI, OpenRouter, vLLM, Ollama, and Google Gemini) provide OpenAI-compatible REST endpoints (`/chat/completions` and `/embeddings`). The `OpenAiCompatibleProvider` encapsulates standard client initialization using base URLs and keys.
- **Decoupled Chat & Embedding Endpoints**: Enables pairing high-speed chat engines (e.g. Groq `llama-3.3-70b` at 300+ tok/s) with specialized embedding models (e.g. OpenAI `text-embedding-3-small` or Gemini `gemini-embedding-001`) simultaneously.

### 2. Chunking Strategy & Vector Storage
- **Recursive Structure-Aware Splitting**: Rather than naive fixed-character chunking, `ChunkingService` splits text along logical boundaries: Markdown Headings (`#`, `##`) $\to$ Paragraphs (`\n\n`) $\to$ Bullet points (`- `) $\to$ Sentences (`. `) $\to$ Words.
- **Chunk Size (600 characters / ~150 tokens)**: Keeps chunks focused on single semantic concepts, optimizing cosine similarity precision without diluting facts across broad paragraphs.
- **Overlap (100 characters / ~25 tokens)**: Ensures sentences that span across chunk boundaries retain full semantic context.
- **HNSW Vector Indexing**: Configured pgvector using Hierarchical Navigable Small World (`hnsw (embedding vector_cosine_ops)`) indexes with `m = 16` and `ef_construction = 64`, offering orders-of-magnitude faster approximate nearest neighbor lookups than exhaustive scans.
- **Atomic Chunk Synchronization**: When a document is modified or deleted, all associated vector chunks are purged and re-indexed inside a database transaction, eliminating orphaned embeddings.

### 3. Multi-Tenant Security & Isolation
- **Defense in Depth**: Authenticated users obtain a Supabase JWT on the frontend. The NestJS backend `SupabaseAuthGuard` validates this token against Supabase Auth on every request.
- **Database-Level RLS Enforcement**: Every table (`documents`, `document_chunks`, `conversations`, `messages`) has PostgreSQL Row Level Security enabled with `auth.uid() = user_id`.
- **Protected Vector RPC**: The `match_document_chunks` function enforces `WHERE dc.user_id = p_user_id` inside the SQL execution plan, guaranteeing cross-tenant vector isolation.

### 4. Conversational UI & WhatsApp-Style State Handling
- **Non-Destructive Streaming**: Rather than showing full-screen blocking loaders, message state is updated optimistically. When sending a query, the user's bubble and a bot typing bubble appear immediately.
- **Bouncing Dots Indicator**: Matches the familiar WhatsApp/chat experience with three staggered bouncing dots while awaiting the first token from the RAG search and AI model.
- **Seamless Stream Transition**: The typing bubble transitions smoothly into streaming Markdown as Server-Sent Event (SSE) chunks arrive.
- **Document-Grouped Citations**: Instead of repeating the same document name four times for four separate chunks, citations are aggregated by document title, showing the document card with clickable excerpt tags (`Part 1`, `Part 4`).

---

## 🔄 How to Swap AI Providers

Switching AI providers is 100% configuration-driven via `apps/api/.env` without modifying application code:

### Option A: Google Gemini (Current Default)
```env
AI_PROVIDER_TYPE=gemini
AI_CHAT_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_CHAT_API_KEY=your-gemini-api-key
AI_CHAT_MODEL=gemini-3.8-flash
AI_EMBEDDING_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_EMBEDDING_API_KEY=your-gemini-api-key
AI_EMBEDDING_MODEL=gemini-embedding-001
AI_EMBEDDING_DIMENSION=1536
```

### Option B: OpenAI Direct
```env
AI_PROVIDER_TYPE=openai
AI_CHAT_BASE_URL=https://api.openai.com/v1
AI_CHAT_API_KEY=sk-proj-...
AI_CHAT_MODEL=gpt-4o-mini
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-proj-...
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_EMBEDDING_DIMENSION=1536
```

### Option C: Groq (Ultra-Fast Inference) + OpenAI Embeddings
```env
AI_PROVIDER_TYPE=groq
AI_CHAT_BASE_URL=https://api.groq.com/openai/v1
AI_CHAT_API_KEY=gsk_...
AI_CHAT_MODEL=llama-3.3-70b-versatile
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-proj-...
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_EMBEDDING_DIMENSION=1536
```

### Option D: 100% Free & Local with Ollama
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

### Option E: OpenRouter
```env
AI_PROVIDER_TYPE=openrouter
AI_CHAT_BASE_URL=https://openrouter.ai/api/v1
AI_CHAT_API_KEY=sk-or-v1-...
AI_CHAT_MODEL=anthropic/claude-3.5-haiku
AI_EMBEDDING_BASE_URL=https://api.openai.com/v1
AI_EMBEDDING_API_KEY=sk-proj-...
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_EMBEDDING_DIMENSION=1536
```

---

## ⭐ Implemented Stretch Goals

1. **Real-Time Token Streaming (SSE)**: Full Server-Sent Events implementation streaming assistant response tokens as they generate.
2. **Token & Usage Analytics Dashboard (`/usage`)**: Tracks total tokens, prompt tokens, completion tokens, query counts, and document chunk statistics.
3. **Interactive Source Citations**: Document-grouped source cards displaying chunk index, cosine match percentage, and a modal view of the grounding excerpt.
4. **Multi-Format File Extraction**: Upload PDF, Word (`.docx`), CSV, plain text, and Markdown files with automatic server-side text extraction.
5. **Persistent Conversation History Across Sessions**: Multi-session conversation management with conversation renaming, message history, and session deletion.
6. **WhatsApp-Style Conversational UX**: In-bubble typing animation, status dots, delivered checkmarks, and 1-click response copying.

---

## 🔮 What We Would Improve With More Time

1. **Hybrid Search (Sparse + Dense Retrieval)**: Combine pgvector dense cosine search with PostgreSQL full-text search (`tsvector` / BM25) using Reciprocal Rank Fusion (RRF) for optimal keyword and semantic retrieval.
2. **Asynchronous Ingestion Workers**: For very large documents (100+ pages), offload chunking and vector embedding generation to a background Redis/BullMQ worker queue with real-time websocket progress updates.
3. **Context-Aware Dynamic Re-Ranking**: Integrate a cross-encoder re-ranker (e.g. Cohere Re-rank or BGE-Reranker) to evaluate the top $K$ retrieved chunks before prompt assembly.
4. **Evaluation & RAG Quality Benchmarking**: Implement automated RAGAS (Retrieval Augmented Generation Assessment) evaluation metrics (Faithfulness, Answer Relevance, Context Precision).

---

## 📄 License
MIT License. Developed for the Goodspeed Software Developer Technical Assessment.
