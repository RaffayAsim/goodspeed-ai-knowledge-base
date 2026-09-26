'use client';

import { useEffect, useState, useRef } from 'react';
import { documentsApi } from '../../../lib/api-client';
import { IDocument } from '@kb/types';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Search,
  Tag,
  Clock,
  Layers,
  UploadCloud,
  Loader2,
  X,
  AlertCircle,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

interface ExtractedInfo {
  fileName: string;
  format: string;
  chars: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<IDocument | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo | null>(null);
  const [extractedFileName, setExtractedFileName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentsApi.list();
      setDocuments(docs);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const openCreateModal = () => {
    setEditingDoc(null);
    setTitle('');
    setContent('');
    setTagsInput('');
    setFormError(null);
    setExtractedInfo(null);
    setExtractedFileName(null);
    setIsDragging(false);
    setIsModalOpen(true);
  };

  const openEditModal = (doc: IDocument) => {
    setEditingDoc(doc);
    setTitle(doc.title);
    setContent(doc.content);
    setTagsInput((doc.tags || []).join(', '));
    setFormError(null);
    setExtractedInfo(null);
    setExtractedFileName(null);
    setIsDragging(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDoc(null);
    setFormError(null);
    setExtractedInfo(null);
    setExtractedFileName(null);
    setIsDragging(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFormError('Title and content are required.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingDoc) {
        await documentsApi.update(editingDoc.id, {
          title: title.trim(),
          content: content.trim(),
          tags,
        });
      } else {
        await documentsApi.create({
          title: title.trim(),
          content: content.trim(),
          tags,
        });
      }
      closeModal();
      await fetchDocuments();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save document.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, docTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${docTitle}"?`)) {
      return;
    }
    try {
      await documentsApi.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(`Failed to delete document: ${err.message}`);
    }
  };

  // Universal File Upload & Text Extraction (PDF, DOCX, CSV, JSON, HTML, Markdown, TXT)
  const processFile = async (file: File) => {
    if (!file) return;

    setIsExtracting(true);
    setFormError(null);
    setExtractedFileName(file.name);

    try {
      const result = await documentsApi.extractFile(file);
      if (!title.trim() || title === editingDoc?.title) {
        setTitle(result.title);
      }
      setContent(result.content);
      setExtractedInfo({
        fileName: file.name,
        format: result.format || file.name.split('.').pop() || 'file',
        chars: result.content.length,
      });
    } catch (err: any) {
      setFormError(`File upload error: ${err.message || 'Could not parse document'}`);
      setExtractedInfo(null);
      setExtractedFileName(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const allTags = Array.from(
    new Set(documents.flatMap((d) => d.tags || [])),
  );

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag ? doc.tags?.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 sm:p-6 md:p-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1d1d1f]">Documents</h1>
          <p className="text-sm text-zinc-500 mt-1 font-normal">
            Manage your knowledge library. Documents are chunked and embedded in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              openCreateModal();
              setTimeout(() => fileInputRef.current?.click(), 100);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-orange-50/80 border border-zinc-200 hover:border-orange-300 text-zinc-700 hover:text-[#ff5c00] font-semibold text-sm shadow-xs transition duration-200"
          >
            <UploadCloud className="w-4 h-4 text-[#ff5c00]" /> Upload File
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ff5c00] hover:bg-[#ea5500] text-white font-semibold text-sm shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> Add Document
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search documents by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-full px-11 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ff5c00] transition shadow-xs"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-1">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition shrink-0 ${
                selectedTag === null
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300'
              }`}
            >
              All Tags
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition shrink-0 ${
                  selectedTag === tag
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Documents Grid / Empty State */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-[#ff5c00] animate-spin" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 rounded-3xl border border-dashed border-zinc-200 bg-white/60 text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#ff5c00] mb-4 shadow-xs">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">No documents yet</h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-6">
              {searchQuery || selectedTag
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Upload any document (PDF, Word, CSV, JSON, Markdown, TXT) to start building your knowledge base.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  openCreateModal();
                  setTimeout(() => fileInputRef.current?.click(), 100);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-orange-50 border border-zinc-200 hover:border-orange-300 text-zinc-800 hover:text-[#ff5c00] font-semibold text-xs shadow-xs transition"
              >
                <UploadCloud className="w-4 h-4 text-[#ff5c00]" /> Upload Document
              </button>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ff5c00] hover:bg-[#ea5500] text-white font-semibold text-xs shadow-md transition"
              >
                <Plus className="w-4 h-4" /> Create Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="group flex flex-col justify-between rounded-3xl apple-glass-card hover:shadow-xl hover:border-orange-200 p-6 transition-all duration-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-zinc-900 text-base line-clamp-1 group-hover:text-[#ff5c00] transition">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEditModal(doc)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition"
                        title="Edit Document"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 line-clamp-3 mb-5 leading-relaxed font-normal">
                    {doc.content}
                  </p>
                </div>

                <div className="space-y-3.5 pt-3.5 border-t border-zinc-100">
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-0.5 rounded-full bg-orange-50 text-[11px] text-[#ff5c00] font-medium border border-orange-200/50"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <span className="flex items-center gap-1 text-zinc-600">
                      <Layers className="w-3 h-3 text-[#ff5c00]" />
                      {doc.chunkCount ?? 0} {doc.chunkCount === 1 ? 'vector chunk' : 'vector chunks'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apple-Style Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-white border border-zinc-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-zinc-900">
                  {editingDoc ? 'Edit Document' : 'Add New Document'}
                </h2>
                <p className="text-xs text-zinc-400">Embeddings update automatically upon save.</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-zinc-400 hover:text-zinc-900 rounded-full hover:bg-zinc-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-5">
              {formError && (
                <div className="p-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{formError}</span>
                </div>
              )}

              {/* Dedicated Apple-Style Drag & Drop Zone */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">
                  Upload Document or File
                </label>

                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative cursor-pointer border-2 border-dashed rounded-3xl p-5 text-center transition-all duration-200 flex flex-col items-center justify-center select-none ${
                    isDragging
                      ? 'border-[#ff5c00] bg-orange-100/50 ring-4 ring-orange-500/15 scale-[1.01]'
                      : isExtracting
                      ? 'border-orange-300 bg-orange-50/50 cursor-wait'
                      : extractedInfo
                      ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400'
                      : 'border-zinc-200/90 bg-gradient-to-b from-orange-50/20 via-white to-zinc-50/40 hover:border-orange-400 hover:bg-orange-50/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    disabled={isExtracting}
                    accept=".pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.log,.rtf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {isExtracting ? (
                    <div className="flex flex-col items-center py-2 animate-in fade-in">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#ff5c00] flex items-center justify-center mb-2.5 shadow-xs">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                      <p className="text-sm font-bold text-zinc-900">
                        Extracting & parsing "{extractedFileName || 'document'}"...
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Extracting readable text, tables, and formatting...
                      </p>
                    </div>
                  ) : extractedInfo ? (
                    <div className="flex flex-col items-center py-1 animate-in fade-in">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 shadow-xs">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-zinc-900">
                          {extractedInfo.fileName}
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wider">
                          {extractedInfo.format}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Parsed {extractedInfo.chars.toLocaleString()} characters. Click or drop another file to replace.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-1">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/80 text-[#ff5c00] flex items-center justify-center mb-2.5 shadow-xs group-hover:scale-110 group-hover:bg-orange-100 transition-all duration-200">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-zinc-900 mb-0.5">
                        <span className="text-[#ff5c00] underline underline-offset-2">Click to upload</span> or drag & drop document
                      </p>
                      <p className="text-xs text-zinc-400 max-w-sm mb-2.5">
                        Automatically populates document title and extracts readable content
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {['PDF', 'DOCX', 'CSV', 'JSON', 'Markdown', 'TXT'].map((ext) => (
                          <span
                            key={ext}
                            className="px-2.5 py-0.5 rounded-full bg-white border border-zinc-200 text-[10px] font-semibold text-zinc-600 shadow-3xs"
                          >
                            {ext}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Strategy, Customer Handbook, Resume, API Specs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ff5c00] transition shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                    Content (Markdown Supported)
                  </label>
                  {content.length > 0 && (
                    <span className="text-[11px] font-medium text-zinc-400">
                      {content.length.toLocaleString()} characters
                    </span>
                  )}
                </div>
                <textarea
                  required
                  rows={8}
                  placeholder="Write, paste, or review the extracted document content here (plain text or markdown)..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200 rounded-2xl p-4 text-xs text-zinc-900 placeholder-zinc-400 font-mono focus:outline-none focus:ring-2 focus:ring-[#ff5c00] focus:bg-white transition resize-y leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                  Tags (Comma separated)
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. roadmap, product, engineering"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-10 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ff5c00] transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 rounded-full border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || isExtracting}
                  className="px-6 py-2.5 rounded-full bg-[#ff5c00] hover:bg-[#ea5500] disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-orange-500/25 transition-all duration-200 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Chunking & Indexing...</span>
                    </>
                  ) : (
                    <span>{editingDoc ? 'Save Changes' : 'Create & Index'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
