'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import Link from 'next/link';
import { Sparkles, ArrowRight, Database, Cpu, Shield, Layers, FileText, Zap } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/chat');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd] text-[#1d1d1f]">
      {/* Floating Apple-Style Frosted Top Navigation */}
      <header className="sticky top-4 z-40 max-w-5xl mx-auto w-[92%] sm:w-full mt-4">
        <div className="apple-glass rounded-full px-6 py-3 flex items-center justify-between shadow-sm">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-[#1d1d1f]">
              Knowledge<span className="text-[#ff5c00]">Base</span>
            </span>
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-medium text-zinc-600 hover:text-zinc-950 px-3 py-1.5 transition"
            >
              Sign In
            </Link>
            <Link
              href="/login?tab=register"
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-full bg-[#ff5c00] hover:bg-[#ea5500] text-white shadow-md shadow-orange-500/20 transition-all duration-300 flex items-center gap-1.5 hover:shadow-lg hover:shadow-orange-500/30"
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-16 pb-20 max-w-5xl mx-auto">
        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-200/80 bg-orange-50 text-[#ff5c00] text-xs font-semibold tracking-wide mb-8 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#ff5c00] animate-pulse" />
          RAG Vector Engine &bull; Swappable AI
        </div>

        {/* Apple Big Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#1d1d1f] mb-6 max-w-4xl leading-[1.08]">
          Knowledge Base.{' '}
          <span className="bg-gradient-to-r from-[#ff5c00] via-[#ff782d] to-amber-500 bg-clip-text text-transparent">
            Reimagined.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mb-10 font-normal leading-relaxed">
          Upload any document format. Retrieve facts with sub-millisecond pgvector precision. 
          Query your intelligence with guaranteed citations and swappable models.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-20 w-full sm:w-auto">
          <Link
            href="/login?tab=register"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#ff5c00] hover:bg-[#ea5500] text-white font-semibold text-base shadow-xl shadow-orange-500/25 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            Launch Knowledge Base <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-full border border-zinc-200 bg-white/80 hover:bg-white text-zinc-800 font-semibold text-base shadow-xs hover:border-zinc-300 transition"
          >
            Sign In to Account
          </Link>
        </div>

        {/* Apple Bento Grid Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          {/* Card 1 */}
          <div className="apple-glass-card rounded-3xl p-8 hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#ff5c00] mb-6 group-hover:scale-110 transition-transform">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">pgvector Search</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Recursive Markdown chunking with HNSW cosine similarity search on PostgreSQL. Retrieves relevant chunks with zero hallucination.
            </p>
          </div>

          {/* Card 2 */}
          <div className="apple-glass-card rounded-3xl p-8 hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#ff5c00] mb-6 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">Swappable AI</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Provider-agnostic strategy pattern. Swap between Google Gemini, OpenAI, Groq, Together, and local Ollama without touching code.
            </p>
          </div>

          {/* Card 3 */}
          <div className="apple-glass-card rounded-3xl p-8 hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#ff5c00] mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">Universal Documents</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Direct text extraction for PDF, Microsoft Word, CSV, JSON, Markdown, and plain text. Ingests any format instantly.
            </p>
          </div>
        </div>

        {/* Feature Highlights Row */}
        <div className="mt-12 p-8 apple-glass-card rounded-3xl w-full flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-zinc-900 text-base">Real-Time Streaming & Citations</div>
              <div className="text-xs text-zinc-500">Inspect exact source documents and similarity scores for every answer.</div>
            </div>
          </div>
          <Link
            href="/login?tab=register"
            className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition shrink-0"
          >
            Try It Now
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 py-8 px-6 text-center text-xs text-zinc-400">
        &copy; 2026 KnowledgeBase AI &bull; Built with Next.js, NestJS & Supabase pgvector
      </footer>
    </div>
  );
}
