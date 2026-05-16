type Entry = { failures: number; windowEndsAt: number; blockedUntil: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const BLOCK_MS = 15 * 60 * 1000;

const byIp = new Map<string, Entry>();

function prune(now: number) {
  if (byIp.size < 500) return;
  for (const [ip, entry] of byIp) {
    if (entry.blockedUntil < now && entry.windowEndsAt < now) {
      byIp.delete(ip);
    }
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

export function checkLoginAllowed(
  ip: string,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const entry = byIp.get(ip);
  if (!entry) return { ok: true };
  if (entry.blockedUntil > now) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)),
    };
  }
  return { ok: true };
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  prune(now);
  const entry = byIp.get(ip);
  if (!entry || entry.windowEndsAt < now) {
    byIp.set(ip, {
      failures: 1,
      windowEndsAt: now + WINDOW_MS,
      blockedUntil: 0,
    });
    return;
  }
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.blockedUntil = now + BLOCK_MS;
  }
}

export function clearLoginFailures(ip: string): void {
  byIp.delete(ip);
}
