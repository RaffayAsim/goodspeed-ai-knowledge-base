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
        .catch(() => {});
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfbfd]">
        <Loader2 className="w-8 h-8 text-[#ff5c00] animate-spin" />
      </div>
    );
  }

  const navItems = [
    { label: 'AI Chat', href: '/chat', icon: MessageSquare },
    { label: 'Documents', href: '/documents', icon: FileText },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#fbfbfd] text-[#1d1d1f]">
      {/* Apple-Style Sleek Frosted Sidebar */}
      <aside className="w-64 border-r border-zinc-200/80 bg-white/70 backdrop-blur-2xl flex flex-col justify-between shrink-0 shadow-xs">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-zinc-100">
            <Link href="/chat" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[#1d1d1f] text-base tracking-tight">
                Knowledge<span className="text-[#ff5c00]">Base</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-orange-50 text-[#ff5c00] shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#ff5c00]' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-[#ff5c00]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area: Active Model Badge & User Profile */}
        <div className="p-4 border-t border-zinc-100 space-y-3">
          {/* Swappable Provider Pill Badge */}
          {providerInfo && (
            <div className="px-3.5 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[#ff5c00] animate-pulse" />
              <div className="overflow-hidden">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-[#ff5c00]" />
                  {providerInfo.provider} active
                </div>
                <div className="text-xs font-mono text-zinc-800 font-medium truncate">
                  {providerInfo.chatModel}
                </div>
              </div>
            </div>
          )}

          {/* User Capsule & Sign Out */}
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="overflow-hidden pr-2">
              <div className="text-xs font-semibold text-zinc-900 truncate">{user.email}</div>
              <div className="text-[10px] text-zinc-400 font-medium">Active Session</div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#fbfbfd]">
        {children}
      </main>
    </div>
  );
}
