'use client';

import { useCallback, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { copyUrlToClipboard } from '@/lib/share/copy-to-clipboard';

type ShareButtonProps = {
  /** Used for toast / accessibility when the page has a clear title. */
  title?: string;
  className?: string;
  /** Match bookmark-style icon button or compact pill. */
  variant?: 'icon' | 'pill';
};

export function ShareButton({
  title,
  className,
  variant = 'icon',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyPageLink = useCallback(async () => {
    const url = window.location.href;
    const ok = await copyUrlToClipboard(url);

    if (!ok) {
      toast.error('Could not copy link');
      return;
    }

    setCopied(true);
    toast.success('Link copied to clipboard');
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  const label = title ? `Share ${title}` : 'Share this page';

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={() => void copyPageLink()}
        className={clsx(
          'inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
          className,
        )}
        aria-label={label}
      >
        {copied ? (
          <Check size={14} className="text-green-600" />
        ) : (
          <Share2 size={14} />
        )}
        <span>Share</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void copyPageLink()}
      aria-label={copied ? 'Link copied' : label}
      title="Copy link"
      className={clsx(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
        copied && 'border-green-500/30 text-green-600',
        className,
      )}
    >
      {copied ? (
        <Check size={14} className="text-green-600" />
      ) : (
        <Share2 size={14} />
      )}
    </button>
  );
}
