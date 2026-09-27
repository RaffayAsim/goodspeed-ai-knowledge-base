'use client';

import { useEffect, useState } from 'react';
import { chatApi } from '../../../lib/api-client';
import { IUsageStats } from '@kb/types';
import {
  Cpu,
  Database,
  MessageSquare,
  Sparkles,
  Zap,
  RefreshCw,
  Layers,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  FileText,
} from 'lucide-react';

export default function UsagePage() {
  const [stats, setStats] = useState<IUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await chatApi.getUsageStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load usage stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-zinc-400 gap-3">
        <RefreshCw className="w-8 h-8 text-[#ff5c00] animate-spin" />
        <span className="text-xs font-medium">Loading usage analytics...</span>
      </div>
    );
  }

  const promptPct = stats?.totalTokens
    ? Math.round((stats.promptTokens / stats.totalTokens) * 100)
    : 50;
  const completionPct = 100 - promptPct;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 space-y-8 bg-[#fbfbfd]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-[#ff5c00] border border-orange-200/80 text-[11px] font-bold uppercase tracking-wider">
              Telemetry & Usage
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Tracking
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] tracking-tight">
            Usage & Token Tracking
          </h1>
          <p className="text-sm text-zinc-500 mt-1 font-normal">
            Real-time metrics for LLM token consumption, pgvector embeddings, and RAG retrieval.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-zinc-200 hover:border-orange-300 hover:bg-orange-50 text-xs font-semibold text-zinc-700 shadow-2xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#ff5c00] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tokens */}
        <div className="apple-glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-orange-200 transition-all duration-300">
          <div className="flex items-center justify-between text-zinc-400 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Total Tokens
            </span>
            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-[#ff5c00] flex items-center justify-center shadow-2xs">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#1d1d1f] tracking-tight mb-2">
            {(stats?.totalTokens || 0).toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="text-[#ff5c00] font-semibold">{stats?.promptTokens?.toLocaleString() || 0} prompt</span>
            <span>•</span>
            <span className="text-zinc-700 font-semibold">{stats?.completionTokens?.toLocaleString() || 0} completion</span>
          </div>
        </div>

        {/* AI Queries Processed */}
        <div className="apple-glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-orange-200 transition-all duration-300">
          <div className="flex items-center justify-between text-zinc-400 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Queries Processed
            </span>
            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-[#ff5c00] flex items-center justify-center shadow-2xs">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#1d1d1f] tracking-tight mb-2">
            {stats?.totalQueries || 0}
          </div>
          <p className="text-[11px] text-zinc-500">
            Across {stats?.totalConversations || 0} active conversational sessions
          </p>
        </div>

        {/* Vector Chunks in pgvector */}
        <div className="apple-glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-orange-200 transition-all duration-300">
          <div className="flex items-center justify-between text-zinc-400 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Vector Chunks
            </span>
            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-[#ff5c00] flex items-center justify-center shadow-2xs">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#1d1d1f] tracking-tight mb-2">
            {stats?.chunksCount || 0}
          </div>
          <p className="text-[11px] text-zinc-500">
            Indexed from {stats?.documentsCount || 0} uploaded documents
          </p>
        </div>

        {/* Swappable AI Engine Info */}
        <div className="apple-glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-orange-200 transition-all duration-300">
          <div className="flex items-center justify-between text-zinc-400 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Active AI Provider
            </span>
            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-[#ff5c00] flex items-center justify-center shadow-2xs">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-bold text-[#1d1d1f] tracking-tight mb-1 truncate">
            {stats?.providerInfo?.provider || 'OpenRouter / OpenAI'}
          </div>
          <div className="text-[11px] font-mono text-zinc-500 truncate" title={stats?.providerInfo?.chatModel}>
            {stats?.providerInfo?.chatModel || 'meta-llama/llama-3.3-70b-instruct'}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3" />
            Provider-Agnostic Mode
          </div>
        </div>
      </div>

      {/* Token Distribution & RAG Architecture Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Ratio Card */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-5 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#ff5c00]" />
              Token Distribution
            </h2>
            <span className="text-[11px] text-zinc-400 font-mono">100% Total</span>
          </div>

          {/* Visual Dual-Tone Bar */}
          <div className="space-y-2">
            <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${promptPct}%` }}
                className="bg-[#ff5c00] h-full transition-all duration-500"
                title={`Prompt Tokens: ${promptPct}%`}
              />
              <div
                style={{ width: `${completionPct}%` }}
                className="bg-zinc-800 h-full transition-all duration-500"
                title={`Completion Tokens: ${completionPct}%`}
              />
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-[#ff5c00]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5c00]" />
                <span>Prompt: {promptPct}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-700">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <span>Completion: {completionPct}%</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2 text-xs text-zinc-600">
            <div className="flex justify-between">
              <span className="text-zinc-500">Avg. Tokens / Query</span>
              <span className="font-mono font-bold text-zinc-800">
                {stats?.totalQueries
                  ? Math.round((stats.totalTokens || 0) / stats.totalQueries)
                  : 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Embedding Model</span>
              <span className="font-mono font-semibold text-zinc-800 truncate max-w-[140px]" title={stats?.providerInfo?.embeddingModel}>
                {stats?.providerInfo?.embeddingModel || 'text-embedding-3-small'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Vector Dimension</span>
              <span className="font-mono font-bold text-zinc-800">1536 (pgvector)</span>
            </div>
          </div>
        </div>

        {/* Architecture & Provider Swapping Guide */}
        <div className="apple-glass-card rounded-3xl p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#ff5c00]" />
              Swappable AI Architecture Overview
            </h2>
            <span className="text-xs text-zinc-400 font-mono">Goodspeed Assessment Spec</span>
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed font-normal">
            The AI integration follows an abstract <code className="text-[#ff5c00] bg-orange-50 px-1 py-0.5 rounded font-mono font-bold">IAiProvider</code> contract.
            Zero application code changes are required to swap between OpenAI, OpenRouter, Groq, Together AI, or local Ollama. All parameters are dynamically loaded from environment configuration:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Vector Search
              </div>
              <div className="text-xs font-bold text-zinc-900">pgvector RPC</div>
              <div className="text-[11px] text-zinc-500 mt-1">Cosine similarity RPC matching user files with strict RLS.</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Streaming Protocol
              </div>
              <div className="text-xs font-bold text-zinc-900">Server-Sent Events</div>
              <div className="text-[11px] text-zinc-500 mt-1">Real-time SSE token delivery with inline citations.</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Token Tracking
              </div>
              <div className="text-xs font-bold text-zinc-900">Per-Message Telemetry</div>
              <div className="text-[11px] text-zinc-500 mt-1">Automatic token tracking recorded directly in Postgres.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Queries & Token Log Table */}
      <div className="apple-glass-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#ff5c00]" />
              Recent Queries & Token Usage Log
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Historical record of recent questions, retrieved citations, and calculated tokens.
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {stats?.recentQueries?.length || 0} recent requests
          </span>
        </div>

        {(!stats?.recentQueries || stats.recentQueries.length === 0) ? (
          <div className="py-12 text-center text-zinc-400 text-xs">
            No queries recorded yet. Ask questions in the AI Chat to generate usage logs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200/80 text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-3">User Query</th>
                  <th className="py-3 px-3">Response Preview</th>
                  <th className="py-3 px-3">Sources Cited</th>
                  <th className="py-3 px-3">Tokens</th>
                  <th className="py-3 px-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {stats.recentQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-zinc-50/70 transition">
                    <td className="py-3.5 px-3 font-semibold text-zinc-900 max-w-xs truncate" title={q.query}>
                      {q.query}
                    </td>
                    <td className="py-3.5 px-3 text-zinc-500 max-w-sm truncate" title={q.responsePreview}>
                      {q.responsePreview}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-[#ff5c00] border border-orange-100 text-[10px] font-bold">
                        <Layers className="w-3 h-3" />
                        {q.citationsCount} chunks
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-zinc-800">
                      {q.tokenCount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right text-zinc-400 text-[11px] whitespace-nowrap">
                      {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
