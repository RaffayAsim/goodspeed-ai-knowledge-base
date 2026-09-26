'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/auth-context';
import { Sparkles, Mail, Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState<'login' | 'register'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: signInErr } = await signIn(email, password);
        if (signInErr) {
          setError(signInErr.message);
        } else {
          router.push('/chat');
        }
      } else {
        const { error: signUpErr } = await signUp(email, password);
        if (signUpErr) {
          setError(signUpErr.message);
        } else {
          setSuccessMsg('Account created successfully! Check your email or sign in.');
          setMode('login');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center space-x-2.5 mb-4 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-[#1d1d1f]">
            Knowledge<span className="text-[#ff5c00]">Base</span>
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
          {mode === 'login' ? 'Welcome back.' : 'Create your account.'}
        </h2>
        <p className="text-sm text-zinc-500 mt-1 font-normal">
          {mode === 'login'
            ? 'Sign in to access your documents and chat with AI.'
            : 'Get started with context-aware document intelligence.'}
        </p>
      </div>

      {/* Auth Card */}
      <div className="apple-glass-card rounded-3xl p-8 shadow-xl shadow-zinc-200/50">
        {/* Apple Style Segmented Control */}
        <div className="flex rounded-full bg-zinc-100 p-1 mb-6 border border-zinc-200/60">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all duration-200 ${
              mode === 'login'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all duration-200 ${
              mode === 'register'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl border border-red-200 bg-red-50 text-red-600 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-10 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ff5c00] focus:border-transparent transition shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-xl px-10 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ff5c00] focus:border-transparent transition shadow-2xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 px-4 rounded-full bg-[#ff5c00] hover:bg-[#ea5500] disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-orange-500/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fbfbfd]">
      <Suspense fallback={<Loader2 className="w-8 h-8 text-[#ff5c00] animate-spin" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
