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
  Menu,
  X,
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-zinc-200 shadow-2xl flex flex-col justify-between md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
            <Link
              href="/chat"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center space-x-2.5 group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-md shadow-orange-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[#1d1d1f] text-base tracking-tight">
                Knowledge<span className="text-[#ff5c00]">Base</span>
              </span>
            </Link>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
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

        {/* Mobile Drawer Footer */}
        <div className="p-4 border-t border-zinc-100 space-y-3">
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
      </div>

      {/* Desktop Apple-Style Sleek Frosted Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-zinc-200/80 bg-white/70 backdrop-blur-2xl flex-col justify-between shrink-0 shadow-xs">
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
        {/* Mobile Header Bar (Only visible on small screens) */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl shrink-0 z-30">
          <Link href="/chat" className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-[#1d1d1f] text-sm tracking-tight">
              Knowledge<span className="text-[#ff5c00]">Base</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {children}
      </main>
    </div>
  );
}
