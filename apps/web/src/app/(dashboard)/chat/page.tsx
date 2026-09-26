'use client';

import { useEffect, useState, useRef } from 'react';
import { chatApi } from '../../../lib/api-client';
import { IConversation, IMessage, ICitation } from '@kb/types';
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Bot,
  User,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatPage() {
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<ICitation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Load conversation list
  const loadConversations = async () => {
    try {
      const list = await chatApi.listConversations();
      setConversations(list);
      if (list.length > 0 && !currentConvId) {
        selectConversation(list[0]!.id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const selectConversation = async (id: string) => {
    try {
      setLoadingConv(true);
      setCurrentConvId(id);
      const conv = await chatApi.getConversation(id);
      setMessages(conv.messages || []);
    } catch (err) {
      console.error(`Failed to load conversation ${id}:`, err);
    } finally {
      setLoadingConv(false);
    }
  };

  const startNewConversation = () => {
    setCurrentConvId(null);
    setMessages([]);
    setInputMessage('');
    setSelectedCitation(null);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation history?')) return;

    try {
      await chatApi.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConvId === id) {
        startNewConversation();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputMessage.trim();
    if (!query || isStreaming) return;

    setInputMessage('');

    // Append user message immediately to state
    const userMessage: IMessage = {
      id: `user-${Date.now()}`,
      conversationId: currentConvId || '',
      role: 'user',
      content: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    // Placeholder assistant message for incoming stream tokens
    const assistantMessageId = `assist-${Date.now()}`;
    const initialAssistantMsg: IMessage = {
      id: assistantMessageId,
      conversationId: currentConvId || '',
      role: 'assistant',
      content: '',
      citations: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      await chatApi.streamMessage(
        {
          conversationId: currentConvId ?? undefined,
          message: query,
        },
        {
          onCitations: (citations, convId) => {
            if (!currentConvId && convId) {
              setCurrentConvId(convId);
              loadConversations();
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, citations } : msg,
              ),
            );
          },
          onDelta: (chunk) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg,
              ),
            );
          },
          onDone: ({ conversationId }) => {
            setIsStreaming(false);
            if (conversationId && conversationId !== currentConvId) {
              setCurrentConvId(conversationId);
              loadConversations();
            }
          },
          onError: (errMsg) => {
            setIsStreaming(false);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content:
                        msg.content +
                        `\n\n*(Error while streaming: ${errMsg})*`,
                    }
                  : msg,
              ),
            );
          },
        },
      );
    } catch (err: any) {
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `An error occurred: ${err.message || 'Failed to connect to API'}`,
              }
            : msg,
        ),
      );
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversations History Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-950/40 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Conversations
          </span>
          <button
            onClick={startNewConversation}
            className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 transition flex items-center gap-1 text-xs font-medium"
            title="Start New Chat"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              No conversations yet. Ask a question to begin!
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                  currentConvId === conv.id
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden pr-1">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition"
                  title="Delete chat"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Thread */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/20">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {loadingConv ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto py-12">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-500/20 mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Knowledge Base AI Assistant
              </h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Ask anything about your stored documents. The assistant retrieves relevant
                context from Supabase pgvector and cites exact sources.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
                <button
                  onClick={() =>
                    setInputMessage('Summarize the main points across all documents.')
                  }
                  className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-xs text-slate-300 transition"
                >
                  💡 "Summarize the main points across all documents."
                </button>
                <button
                  onClick={() =>
                    setInputMessage('What are the key dates and deadlines listed?')
                  }
                  className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-xs text-slate-300 transition"
                >
                  📅 "What are the key dates and deadlines listed?"
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
                }`}
              >
                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="space-y-2 max-w-[85%]">
                  <div
                    className={`rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 rounded-tr-sm'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-200 shadow-md rounded-tl-sm backdrop-blur'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || '...'}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Citations / Sources Drawer */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-blue-400" />
                        Retrieved Sources ({msg.citations.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cite, idx) => (
                          <button
                            key={cite.chunkId || idx}
                            onClick={() => setSelectedCitation(cite)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-[11px] text-slate-300 hover:text-white transition"
                          >
                            <FileText className="w-3 h-3 text-blue-400" />
                            <span className="font-medium truncate max-w-[130px]">
                              {cite.documentTitle}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              {Math.round(cite.similarity * 100)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 md:p-6 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-xl">
          <form
            onSubmit={handleSendMessage}
            className="max-w-3xl mx-auto flex items-center gap-2 relative"
          >
            <input
              type="text"
              placeholder="Ask a question about your documents..."
              value={inputMessage}
              disabled={isStreaming}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition pr-12 shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isStreaming}
              className="absolute right-2 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white shadow-md shadow-blue-600/30 transition flex items-center justify-center"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <div className="text-center text-[11px] text-slate-500 mt-2">
            AI responses are retrieved from your private documents via pgvector.
          </div>
        </div>
      </div>

      {/* Citation Details Modal / Drawer */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
                  Source Citation
                </div>
                <h3 className="text-base font-bold text-white">
                  {selectedCitation.documentTitle}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold">
                {Math.round(selectedCitation.similarity * 100)}% Match
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed max-h-64 overflow-y-auto">
              {selectedCitation.snippet}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                Close Snippet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
