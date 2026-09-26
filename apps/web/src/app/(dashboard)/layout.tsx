'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { chatApi } from '../../lib/api-client';
import Link from 'next/link';
import {
  MessageSquare,
  FileText,
  LogOut,
  Sparkles,
  Cpu,
  Loader2,
  ChevronRight,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [providerInfo, setProviderInfo] = useState<{
    provider: string;
    chatModel: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      chatApi.getProviderInfo()
        .then(setProviderInfo)
        .catch(() => {
          // Fallback or silent fail if api is offline during setup
        });
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const navItems = [
    { label: 'AI Chat', href: '/chat', icon: MessageSquare },
    { label: 'Documents', href: '/documents', icon: FileText },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#090d16]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-xl flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="p-5 border-b border-slate-800/80">
            <Link href="/chat" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-base tracking-tight">
                Knowledge<span className="text-blue-500">Base</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area: Active Model Badge & User Profile */}
        <div className="p-3 border-t border-slate-800/80 space-y-3">
          {/* Swappable Provider Badge */}
          {providerInfo && (
            <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="overflow-hidden">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-emerald-400" />
                  {providerInfo.provider} active
                </div>
                <div className="text-xs font-mono text-slate-200 truncate">
                  {providerInfo.chatModel}
                </div>
              </div>
            </div>
          )}

          {/* User & Sign Out */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="overflow-hidden pr-2">
              <div className="text-xs font-medium text-white truncate">{user.email}</div>
              <div className="text-[10px] text-slate-400">Authenticated</div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950/20">
        {children}
      </main>
    </div>
  );
}
