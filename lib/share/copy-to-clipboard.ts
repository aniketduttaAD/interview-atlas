/** Copy plain text via legacy `execCommand` when the Async Clipboard API is unavailable. */
function legacyCopyText(text: string): boolean {
  if (typeof document === 'undefined') return false;

  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.cssText =
    'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
  document.body.appendChild(el);
  el.focus();
  el.select();
  el.setSelectionRange(0, text.length);

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }

  document.body.removeChild(el);
  return ok;
}

/**
 * Copy a URL using the Async Clipboard API (`writeText` / `write` + `ClipboardItem`),
 * with a legacy fallback for insecure contexts or older browsers.
 */
export async function copyUrlToClipboard(url: string): Promise<boolean> {
  if (!url) return false;

  const { clipboard } =
    typeof navigator !== 'undefined' ? navigator : { clipboard: undefined };

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(url);
      return true;
    } catch {
      // try write() or legacy fallback
    }
  }

  if (typeof ClipboardItem !== 'undefined' && clipboard?.write) {
    try {
      await clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([url], { type: 'text/plain' }),
          'text/uri-list': new Blob([url], { type: 'text/uri-list' }),
        }),
      ]);
      return true;
    } catch {
      // legacy fallback
    }
  }

  return legacyCopyText(url);
}
