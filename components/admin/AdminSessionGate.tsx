'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { adminPostJsonInit } from '@/lib/admin/admin-fetch';

type SessionState =
  | { status: 'loading' }
  | { status: 'ready'; locked: false }
  | { status: 'ready'; locked: true; authenticated: boolean };

export function AdminSessionGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const applySessionPayload = useCallback(
    (data: { locked?: boolean; authenticated?: boolean }) => {
      if (!data.locked) {
        setSession({ status: 'ready', locked: false });
        return;
      }
      setSession({
        status: 'ready',
        locked: true,
        authenticated: Boolean(data.authenticated),
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch('/api/admin/session', { credentials: 'include' });
      const data = (await res.json()) as {
        locked?: boolean;
        authenticated?: boolean;
      };
      if (cancelled) return;
      applySessionPayload(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [applySessionPayload]);

  const refreshSession = useCallback(async () => {
    const res = await fetch('/api/admin/session', { credentials: 'include' });
    const data = (await res.json()) as {
      locked?: boolean;
      authenticated?: boolean;
    };
    applySessionPayload(data);
  }, [applySessionPayload]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        '/api/admin/login',
        adminPostJsonInit({ secret }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === 'string' ? data.error : 'Sign-in failed.',
        );
        return;
      }
      setSecret('');
      await refreshSession();
    } finally {
      setSubmitting(false);
    }
  };

  if (session.status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (session.status === 'ready' && session.locked && !session.authenticated) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
          <Lock className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-lg font-semibold tracking-tight">
            Admin sign-in
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the same value as{' '}
            <code className="text-xs">ADMIN_API_SECRET</code> on the server. A
            secure session cookie is set; nothing is stored in the public client
            bundle.
          </p>
        </div>
        <form
          onSubmit={handleLogin}
          className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Secret
            <input
              type="password"
              autoComplete="current-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="ADMIN_API_SECRET"
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting || !secret.trim()}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
