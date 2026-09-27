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
  Bot,
  User,
  Loader2,
  FileText,
  X,
  Clock,
  Zap,
  Copy,
  Check,
  CheckCheck,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatPage() {
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<ICitation | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [providerInfo, setProviderInfo] = useState<{
    provider: string;
    chatModel: string;
    embeddingModel: string;
    embeddingDimension: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvIdRef = useRef<string | null>(null);

  // Keep ref in sync so SSE callbacks never have stale closures
  useEffect(() => {
    activeConvIdRef.current = currentConvId;
  }, [currentConvId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Initial load on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [list, info] = await Promise.all([
          chatApi.listConversations().catch(() => [] as IConversation[]),
          chatApi.getProviderInfo().catch(() => null),
        ]);
        setConversations(list);
        if (info) setProviderInfo(info);
        if (list.length > 0) {
          selectConversation(list[0]!.id);
        }
      } catch (err) {
        console.error('Failed to load initial conversations:', err);
      }
    };
    init();
  }, []);

  // Background refresh of conversation titles without resetting active state
  const refreshConversationsList = async () => {
    try {
      const list = await chatApi.listConversations();
      setConversations(list);
    } catch (err) {
      console.error('Failed to refresh conversation list:', err);
    }
  };

  const selectConversation = async (id: string) => {
    if (isStreaming) return; // Don't interrupt active streaming
    try {
      setLoadingConv(true);
      setCurrentConvId(id);
      activeConvIdRef.current = id;
      const conv = await chatApi.getConversation(id);
      setMessages(conv.messages || []);
    } catch (err) {
      console.error(`Failed to load conversation ${id}:`, err);
    } finally {
      setLoadingConv(false);
    }
  };

  const startNewConversation = () => {
    if (isStreaming) return;
    setCurrentConvId(null);
    activeConvIdRef.current = null;
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

  const copyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputMessage.trim();
    if (!query || isStreaming) return;

    setInputMessage('');

    const convIdAtSend = activeConvIdRef.current;

    // 1. Immediately append user message to local state
    const userMessage: IMessage = {
      id: `user-${Date.now()}`,
      conversationId: convIdAtSend || '',
      role: 'user',
      content: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    // 2. Immediately append empty assistant message to show WhatsApp typing indicator
    const assistantMessageId = `assist-${Date.now()}`;
    setStreamingMessageId(assistantMessageId);

    const initialAssistantMsg: IMessage = {
      id: assistantMessageId,
      conversationId: convIdAtSend || '',
      role: 'assistant',
      content: '',
      citations: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      await chatApi.streamMessage(
        {
          conversationId: convIdAtSend ?? undefined,
          message: query,
        },
        {
          onCitations: (citations, convId) => {
            if (convId && convId !== activeConvIdRef.current) {
              setCurrentConvId(convId);
              activeConvIdRef.current = convId;
              refreshConversationsList();
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
          onDone: ({ conversationId, tokenCount }) => {
            setIsStreaming(false);
            setStreamingMessageId(null);
            if (conversationId && conversationId !== activeConvIdRef.current) {
              setCurrentConvId(conversationId);
              activeConvIdRef.current = conversationId;
              refreshConversationsList();
            }
            if (tokenCount) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, tokenCount }
                    : msg,
                ),
              );
            }
          },
          onError: (errMsg) => {
            setIsStreaming(false);
            setStreamingMessageId(null);
            const userFriendlyMsg =
              errMsg.includes('503') || errMsg.includes('Service Unavailable') || errMsg.includes('busy')
                ? 'The AI service experienced a momentary high-traffic spike. Please click send again to retry.'
                : `*(Error: ${errMsg})*`;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content:
                        (msg.content ? msg.content + '\n\n' : '') +
                        userFriendlyMsg,
                    }
                  : msg,
              ),
            );
          },
        },
      );
    } catch (err: any) {
      setIsStreaming(false);
      setStreamingMessageId(null);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `An unexpected connection error occurred: ${err.message}`,
              }
            : msg,
        ),
      );
    }
  };

  // Calculate total tokens used across active conversation
  const sessionTotalTokens = messages.reduce(
    (sum, m) => sum + (m.tokenCount || 0),
    0,
  );

  const activeConvTitle =
    conversations.find((c) => c.id === currentConvId)?.title ||
    (messages.length > 0 ? 'Current Conversation' : 'New Knowledge Chat');

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#fbfbfd]">
      {/* Desktop Conversations Sidebar */}
      <aside className="w-72 bg-white/80 backdrop-blur-md border-r border-zinc-200/80 hidden md:flex flex-col h-full shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#ff5c00]" />
            <h2 className="text-xs font-bold text-zinc-800 tracking-tight uppercase">
              Conversations
            </h2>
          </div>
          <button
            onClick={startNewConversation}
            className="p-1.5 rounded-full bg-orange-50 text-[#ff5c00] hover:bg-orange-100 transition flex items-center gap-1 text-xs font-semibold px-2.5 shadow-2xs"
            title="Start New Chat"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-400">
              No conversations yet. Ask a question to begin.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium cursor-pointer transition-all duration-200 ${
                  currentConvId === conv.id
                    ? 'bg-orange-50 text-[#ff5c00] font-semibold shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/60'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden pr-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      currentConvId === conv.id
                        ? 'text-[#ff5c00]'
                        : 'text-zinc-400'
                    }`}
                  />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 rounded transition"
                  title="Delete chat"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer with Provider Status */}
        <div className="p-3 border-t border-zinc-200/60 text-[11px] text-zinc-500 bg-zinc-50/50">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-zinc-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {providerInfo?.chatModel || 'Gemini 3.8 Flash'}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
              RAG Active
            </span>
          </div>
        </div>
      </aside>

      {/* Main Chat Thread */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Chat Header Bar with Token Tracker & Model Info */}
        <div className="px-4 py-3 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile History Toggle */}
            <button
              onClick={() => setMobileHistoryOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 font-semibold hover:bg-zinc-200 text-xs transition"
            >
              <Clock className="w-3.5 h-3.5 text-[#ff5c00]" />
              <span>History</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[#ff5c00]">
                  <Bot className="w-4 h-4" />
                </div>
                {/* WhatsApp online status badge */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              </div>
              <div>
                <h1 className="text-xs font-bold text-zinc-900 truncate max-w-[220px] sm:max-w-xs">
                  {activeConvTitle}
                </h1>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Online
                  </span>
                  <span>•</span>
                  <span>{providerInfo?.chatModel || 'gemini-3.8-flash'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Session Token Showcase Counter */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/80 border border-amber-200/80 text-amber-800 text-[11px] font-mono font-semibold shadow-2xs"
              title="Total tokens consumed in this active chat session"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{sessionTotalTokens.toLocaleString()} tokens</span>
            </div>

            <button
              onClick={startNewConversation}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-50 text-[#ff5c00] hover:bg-orange-100 text-xs font-semibold transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          </div>
        </div>

        {/* Loading Progress Indicator during conversation switch (non-blocking) */}
        {loadingConv && (
          <div className="h-0.5 w-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 animate-pulse" />
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto py-12">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-xl shadow-orange-500/20 mb-5">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] mb-2">
                Ask your documents anything.
              </h2>
              <p className="text-sm text-zinc-500 mb-8 leading-relaxed font-normal">
                Ask questions about your uploaded PDFs, Word docs, CSVs, or notes.
                The assistant retrieves relevant segments with pgvector and cites exact sources.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                <button
                  onClick={() =>
                    setInputMessage('Summarize the main points and key takeaways.')
                  }
                  className="p-4 rounded-2xl apple-glass-card hover:border-orange-300 hover:shadow-md text-xs font-medium text-zinc-700 transition"
                >
                  💡 "Summarize the key takeaways."
                </button>
                <button
                  onClick={() =>
                    setInputMessage('What are the key experiences, roles, or highlights?')
                  }
                  className="p-4 rounded-2xl apple-glass-card hover:border-orange-300 hover:shadow-md text-xs font-medium text-zinc-700 transition"
                >
                  📄 "What are the key experiences and highlights?"
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
                {/* Assistant Avatar with Online Indicator */}
                {msg.role === 'assistant' && (
                  <div className="relative shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#ff5c00] shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                  </div>
                )}

                <div className="space-y-2 max-w-[85%]">
                  <div
                    className={`rounded-3xl p-5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#ff5c00] text-white shadow-lg shadow-orange-500/20 rounded-tr-sm font-medium'
                        : 'apple-glass-card text-zinc-800 shadow-sm rounded-tl-sm font-normal'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div>
                        {/* WhatsApp-Style typing & analyzing indicator when awaiting first token */}
                        {!msg.content && isStreaming && streamingMessageId === msg.id ? (
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-zinc-100/90 text-zinc-600">
                              <span className="w-2 h-2 rounded-full bg-[#ff5c00] animate-bounce [animation-delay:-0.32s]"></span>
                              <span className="w-2 h-2 rounded-full bg-[#ff5c00] animate-bounce [animation-delay:-0.16s]"></span>
                              <span className="w-2 h-2 rounded-full bg-[#ff5c00] animate-bounce"></span>
                            </div>
                            <span className="text-xs font-medium text-zinc-500 italic flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#ff5c00] animate-pulse" />
                              {msg.citations && msg.citations.length > 0
                                ? `Grounded in ${msg.citations.length} document sources...`
                                : 'Analyzing documents & typing...'}
                            </span>
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none text-zinc-800">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                            {/* Blinking cursor while still streaming */}
                            {isStreaming && streamingMessageId === msg.id && (
                              <span className="inline-block w-1.5 h-4 ml-1 bg-[#ff5c00] animate-pulse align-middle rounded-xs" />
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Assistant Message Footer: Token Showcase, Citations & Copy Button */}
                  {msg.role === 'assistant' && msg.content && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 px-1">
                      <div className="flex items-center gap-2">
                        {/* Showcase Token Usage Badge */}
                        {msg.tokenCount !== undefined && msg.tokenCount > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs"
                            title="Total tokens consumed by prompt + generation for this answer"
                          >
                            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>{msg.tokenCount.toLocaleString()} tokens</span>
                          </span>
                        )}

                        <span className="text-[10px] text-zinc-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* 1-Click Copy Response */}
                      <button
                        onClick={() => copyMessage(msg.content, msg.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-700 px-2 py-0.5 rounded-md hover:bg-zinc-100 transition"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* User Message Footer: WhatsApp-style Delivery Status */}
                  {msg.role === 'user' && (
                    <div className="flex items-center justify-end gap-1.5 text-[10px] text-zinc-400 pr-1">
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                  )}

                  {/* Citations / Sources Drawer Grouped by Document */}
                  {msg.citations && msg.citations.length > 0 && (() => {
                    const grouped = Object.values(
                      msg.citations.reduce((acc, cite, idx) => {
                        const key = cite.documentId || cite.documentTitle;
                        const partNumber =
                          cite.chunkIndex !== undefined
                            ? cite.chunkIndex + 1
                            : idx + 1;
                        if (!acc[key]) {
                          acc[key] = {
                            documentId: cite.documentId,
                            documentTitle: cite.documentTitle,
                            chunks: [] as Array<ICitation & { partNumber: number }>,
                            maxSimilarity: cite.similarity,
                          };
                        }
                        acc[key].chunks.push({ ...cite, partNumber });
                        if (cite.similarity > acc[key].maxSimilarity) {
                          acc[key].maxSimilarity = cite.similarity;
                        }
                        return acc;
                      }, {} as Record<string, { documentId: string; documentTitle: string; chunks: Array<ICitation & { partNumber: number }>; maxSimilarity: number }>)
                    );

                    return (
                      <div className="space-y-2 pt-1 pl-1">
                        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#ff5c00]" />
                            Retrieved Sources ({grouped.length} document{grouped.length > 1 ? 's' : ''}, {msg.citations.length} excerpt{msg.citations.length > 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {grouped.map((group) => (
                            <div
                              key={group.documentId || group.documentTitle}
                              className="rounded-2xl border border-zinc-200/90 bg-white/95 p-3 shadow-2xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#ff5c00] shrink-0">
                                    <FileText className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-semibold text-xs text-zinc-900 truncate" title={group.documentTitle}>
                                    {group.documentTitle}
                                  </span>
                                </div>
                                <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                  Top Match: {Math.round(group.maxSimilarity * 100)}%
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] text-zinc-400 font-medium mr-1">
                                  Semantic Excerpts:
                                </span>
                                {group.chunks.map((chunk) => (
                                  <button
                                    key={chunk.chunkId || `${chunk.documentId}-${chunk.partNumber}`}
                                    onClick={() => setSelectedCitation(chunk)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-200/80 hover:border-orange-400 hover:bg-orange-50 text-[11px] text-zinc-700 font-medium transition group shadow-2xs"
                                    title={`Click to read excerpt from Part ${chunk.partNumber}`}
                                  >
                                    <span className="text-[#ff5c00] font-semibold">Part {chunk.partNumber}</span>
                                    <span className="text-[10px] text-emerald-600 font-mono font-bold">
                                      {Math.round(chunk.similarity * 100)}%
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-700 shrink-0 mt-1 shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Input Bar */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-[#fbfbfd] via-[#fbfbfd]/90 to-transparent">
          <form
            onSubmit={handleSendMessage}
            className="max-w-3xl mx-auto flex items-center gap-2 relative apple-glass-card rounded-full p-1.5 pl-6 shadow-xl shadow-zinc-200/60 border border-zinc-200/80"
          >
            <input
              type="text"
              placeholder="Ask a question about your documents..."
              value={inputMessage}
              disabled={isStreaming}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-transparent py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isStreaming}
              className="p-3 rounded-full bg-[#ff5c00] hover:bg-[#ea5500] disabled:opacity-40 text-white shadow-md shadow-orange-500/30 transition-all duration-200 flex items-center justify-center"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          <div className="text-center text-[11px] text-zinc-400 mt-2 font-medium flex items-center justify-center gap-2">
            <span>AI responses grounded in your private documents via pgvector.</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline font-mono text-[10px] text-zinc-500">
              Provider: {providerInfo?.provider || 'gemini'}
            </span>
          </div>
        </div>
      </div>

      {/* Citation Details Modal */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-3xl shadow-2xl p-7 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#ff5c00] mb-1">
                  Document Excerpt • Part{' '}
                  {selectedCitation.chunkIndex !== undefined
                    ? selectedCitation.chunkIndex + 1
                    : 1}
                </div>
                <h3 className="text-lg font-bold text-zinc-900 leading-snug">
                  {selectedCitation.documentTitle}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-xs font-bold">
                {Math.round(selectedCitation.similarity * 100)}% Match
              </span>
            </div>

            <p className="text-xs text-zinc-500">
              This distinct vector segment was retrieved from your uploaded file
              and provided as grounding context to the AI model.
            </p>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 font-mono leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
              {selectedCitation.snippet}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-5 py-2 rounded-full bg-zinc-900 hover:bg-black text-xs font-semibold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Conversations Drawer Sheet */}
      {mobileHistoryOpen && (
        <div
          onClick={() => setMobileHistoryOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 inset-x-0 max-h-[75vh] bg-white rounded-t-3xl shadow-2xl p-5 flex flex-col animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <span className="font-bold text-sm text-zinc-900">Conversations</span>
              <button
                onClick={() => setMobileHistoryOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 py-3 space-y-1">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      selectConversation(conv.id);
                      setMobileHistoryOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl text-xs font-medium cursor-pointer ${
                      currentConvId === conv.id
                        ? 'bg-orange-50 text-[#ff5c00] font-semibold'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="w-4 h-4 shrink-0 text-[#ff5c00]" />
                      <span className="truncate">{conv.title}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
