const SENSITIVE_PATTERNS = [
  /\bsk-[a-zA-Z0-9_-]{8,}\b/g,
  /\bvercel_blob_rw_[a-zA-Z0-9]+\b/gi,
  /\bBearer\s+\S+/gi,
  /\bADMIN_API_SECRET\b/g,
  /\bBLOB_READ_WRITE_TOKEN\b/g,
  /\bOPENAI_API_KEY\b/g,
];

function redactSecrets(message: string): string {
  let out = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    out = out.replace(pattern, '[redacted]');
  }
  return out;
}

/** Avoid leaking API keys or stack details in JSON error responses. */
export function safeApiErrorMessage(error: unknown, fallback: string): string {
  if (process.env.NODE_ENV === 'production') {
    return fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    return redactSecrets(error.message.trim());
  }
  return fallback;
}
