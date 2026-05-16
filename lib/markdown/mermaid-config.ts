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
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis' as const,
      padding: 18,
      nodeSpacing: 48,
      rankSpacing: 56,
    },
    sequence: {
      useMaxWidth: true,
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

/** Keep SVG responsive and centered when the intrinsic box is narrower than the article. */
export function normalizeMermaidSvg(svg: string): string {
  return svg.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    let next = attrs;

    if (!/\brole=/i.test(next)) {
      next += ' role="img"';
    }
    if (!/\baria-label=/i.test(next)) {
      next += ' aria-label="Architecture diagram"';
    }

    const responsiveStyle = 'max-width:100%;height:auto;display:block;';

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
