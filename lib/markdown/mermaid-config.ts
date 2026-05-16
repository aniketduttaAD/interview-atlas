/** Shared Mermaid init for MarkdownRenderer / MermaidDiagram. */
export function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

export function getMermaidInitializeOptions() {
  const dark = isDarkMode();

  return {
    startOnLoad: false,
    theme: (dark ? 'dark' : 'base') as 'dark' | 'base',
    securityLevel: 'strict' as const,
    fontFamily: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
    flowchart: {
      // Keep intrinsic diagram size; container scrolls horizontally when wide.
      useMaxWidth: false,
      htmlLabels: true,
      curve: 'basis' as const,
      padding: 20,
      nodeSpacing: 56,
      rankSpacing: 72,
    },
    sequence: {
      useMaxWidth: false,
    },
    themeVariables: dark
      ? {
          primaryColor: '#1e3a5f',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#60a5fa',
          lineColor: '#94a3b8',
          secondaryColor: '#334155',
          secondaryTextColor: '#e2e8f0',
          tertiaryColor: '#1e293b',
          background: '#0f172a',
          mainBkg: '#1e293b',
          nodeBorder: '#475569',
          clusterBkg: '#1e293b',
          titleColor: '#f8fafc',
          edgeLabelBackground: '#1e293b',
        }
      : {
          primaryColor: '#dbeafe',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#3b82f6',
          lineColor: '#64748b',
          secondaryColor: '#f1f5f9',
          secondaryTextColor: '#0f172a',
          tertiaryColor: '#f8fafc',
          background: '#ffffff',
          mainBkg: '#f8fafc',
          nodeBorder: '#cbd5e1',
          clusterBkg: '#f1f5f9',
          titleColor: '#0f172a',
          edgeLabelBackground: '#ffffff',
        },
  };
}

function mermaidMinHeightFromViewBox(svg: string): number {
  const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/i);
  if (!viewBoxMatch) return 200;

  const parts = viewBoxMatch[1]
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || !parts[2] || !parts[3]) return 200;

  const [, , width, height] = parts;
  const aspect = height / width;
  // Readable height for wide flowcharts when the article is ~720px wide.
  return Math.round(Math.max(180, Math.min(520, aspect * 720)));
}

/** Preserve intrinsic diagram size; parent scrolls on narrow viewports. */
export function normalizeMermaidSvg(svg: string): string {
  const minHeight = mermaidMinHeightFromViewBox(svg);

  return svg.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    let next = attrs.replace(/\s(width|height)=["'][^"']*["']/gi, '');

    if (!/\brole=/i.test(next)) {
      next += ' role="img"';
    }
    if (!/\baria-label=/i.test(next)) {
      next += ' aria-label="Architecture diagram"';
    }

    const responsiveStyle = `display:block;width:auto;height:auto;min-height:${minHeight}px;max-width:none;`;

    if (/\bstyle="/i.test(next)) {
      next = next.replace(
        /\bstyle="([^"]*)"/i,
        (_s, style: string) => `style="${style};${responsiveStyle}"`,
      );
    } else {
      next += ` style="${responsiveStyle}"`;
    }

    if (!/\bpreserveAspectRatio=/i.test(next)) {
      next += ' preserveAspectRatio="xMidYMid meet"';
    }

    return `<svg${next}>`;
  });
}
