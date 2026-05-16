import { getClientIp } from '@/lib/admin/login-rate-limit';

type Entry = { count: number; windowEndsAt: number; blockedUntil: number };

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const BLOCK_MS = 15 * 60 * 1000;

const byIp = new Map<string, Entry>();

function prune(now: number) {
  if (byIp.size < 1000) return;
  for (const [ip, entry] of byIp) {
    if (entry.blockedUntil < now && entry.windowEndsAt < now) {
      byIp.delete(ip);
    }
  }
}

export function checkChatRateLimit(
  ip: string,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const entry = byIp.get(ip);

  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)),
    };
  }

  if (!entry || entry.windowEndsAt < now) {
    byIp.set(ip, { count: 1, windowEndsAt: now + WINDOW_MS, blockedUntil: 0 });
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    entry.blockedUntil = now + BLOCK_MS;
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(BLOCK_MS / 1000)),
    };
  }

  return { ok: true };
}

export function enforceChatRateLimit(req: Request): Response | null {
  const ip = getClientIp(req);
  const rate = checkChatRateLimit(ip);
  if (rate.ok) return null;

  return Response.json(
    { error: 'Too many AI requests. Please wait and try again.' },
    {
      status: 429,
      headers: { 'Retry-After': String(rate.retryAfterSec) },
    },
  );
}
