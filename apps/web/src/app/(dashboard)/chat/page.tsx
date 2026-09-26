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
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

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

    const userMessage: IMessage = {
      id: `user-${Date.now()}`,
      conversationId: currentConvId || '',
      role: 'user',
      content: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

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
    <div className="flex h-full overflow-hidden bg-[#fbfbfd]">
      {/* Conversations History Sidebar */}
      <aside className="w-64 border-r border-zinc-200/80 bg-white/50 backdrop-blur-xl flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Conversations
          </span>
          <button
            onClick={startNewConversation}
            className="p-1.5 rounded-full bg-orange-50 text-[#ff5c00] hover:bg-orange-100 transition flex items-center gap-1 text-xs font-semibold px-2.5"
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
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${currentConvId === conv.id ? 'text-[#ff5c00]' : 'text-zinc-400'}`} />
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
      </aside>

      {/* Main Chat Thread */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Chat Top Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-zinc-200/80 bg-white/70 backdrop-blur-md text-xs shrink-0">
          <button
            onClick={() => setMobileHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 text-zinc-700 font-semibold hover:bg-zinc-200 transition"
          >
            <Clock className="w-3.5 h-3.5 text-[#ff5c00]" />
            <span>History ({conversations.length})</span>
          </button>
          <button
            onClick={startNewConversation}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-50 text-[#ff5c00] font-semibold hover:bg-orange-100 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 space-y-6">
          {loadingConv ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#ff5c00] animate-spin" />
            </div>
          ) : messages.length === 0 ? (
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
                    setInputMessage('Summarize the main points across all documents.')
                  }
                  className="p-4 rounded-2xl apple-glass-card hover:border-orange-300 hover:shadow-md text-xs font-medium text-zinc-700 transition"
                >
                  💡 "Summarize the key takeaways from all docs."
                </button>
                <button
                  onClick={() =>
                    setInputMessage('What are the key dates, milestones, or deadlines?')
                  }
                  className="p-4 rounded-2xl apple-glass-card hover:border-orange-300 hover:shadow-md text-xs font-medium text-zinc-700 transition"
                >
                  📅 "What are the key dates and milestones?"
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
                {/* Assistant Avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#ff5c00] shrink-0 mt-1 shadow-2xs">
                    <Bot className="w-4 h-4" />
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
                      <div className="prose prose-sm max-w-none text-zinc-800">
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
                    <div className="space-y-1.5 pt-1 pl-1">
                      <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-[#ff5c00]" />
                        Retrieved Sources ({msg.citations.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((cite, idx) => (
                          <button
                            key={cite.chunkId || idx}
                            onClick={() => setSelectedCitation(cite)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-zinc-200 hover:border-orange-300 hover:bg-orange-50 text-[11px] text-zinc-700 transition shadow-2xs"
                          >
                            <FileText className="w-3 h-3 text-[#ff5c00]" />
                            <span className="font-semibold truncate max-w-[130px]">
                              {cite.documentTitle}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              {Math.round(cite.similarity * 100)}% match
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

        {/* Apple Style Floating Input Capsule */}
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
          <div className="text-center text-[11px] text-zinc-400 mt-2 font-medium">
            AI responses grounded in your private documents via pgvector.
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
                  Source Citation
                </div>
                <h3 className="text-lg font-bold text-zinc-900">
                  {selectedCitation.documentTitle}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-xs font-bold">
                {Math.round(selectedCitation.similarity * 100)}% Match
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 font-mono leading-relaxed max-h-64 overflow-y-auto">
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
                <div className="p-6 text-center text-xs text-zinc-400">No conversations yet</div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      selectConversation(conv.id);
                      setMobileHistoryOpen(false);
                    }}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs ${
                      currentConvId === conv.id
                        ? 'bg-orange-50 text-[#ff5c00] font-semibold shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="truncate pr-2">{conv.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(e, conv.id);
                      }}
                      className="p-1 text-zinc-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => {
                startNewConversation();
                setMobileHistoryOpen(false);
              }}
              className="mt-3 w-full py-3 rounded-full bg-[#ff5c00] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" /> Start New Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
