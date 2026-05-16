'use client';

import { useEffect, useId, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import {
  getMermaidInitializeOptions,
  normalizeMermaidSvg,
} from '@/lib/markdown/mermaid-config';

interface MermaidDiagramProps {
  chart: string;
}

function MermaidError({ chart, message }: { chart: string; message: string }) {
  return (
    <div
      className="not-prose my-6 w-full min-w-0 max-w-full rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden"
      role="alert"
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-destructive/20 text-destructive text-xs font-semibold">
        <AlertCircle size={14} />
        Mermaid diagram could not be rendered
      </div>
      <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
        {chart}
      </pre>
      <p className="px-4 pb-3 text-[11px] text-destructive/80">{message}</p>
    </div>
  );
}

function MermaidDiagramCanvas({ chart }: { chart: string }) {
  const reactId = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [themeEpoch, setThemeEpoch] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeEpoch((n) => n + 1);
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize(getMermaidInitializeOptions());

        const renderId = `mermaid-${reactId}-${themeEpoch}-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(renderId, chart);
        if (!cancelled) {
          setSvg(normalizeMermaidSvg(rendered));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg(null);
          setError(
            err instanceof Error ? err.message : 'Could not render diagram',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, reactId, themeEpoch]);

  if (error) {
    return <MermaidError chart={chart} message={error} />;
  }

  return (
    <figure
      className={clsx(
        'not-prose my-6 w-full min-w-0 max-w-full',
        'rounded-xl border border-border/50 bg-card/40 shadow-sm',
      )}
      aria-busy={!svg}
    >
      <div
        className={clsx(
          'mermaid-scroll w-full min-w-0 overflow-x-auto overscroll-x-contain',
          '[-webkit-overflow-scrolling:touch]',
          'px-3 py-4 sm:px-5 sm:py-5',
        )}
      >
        {!svg ? (
          <div className="flex min-h-[200px] w-full items-center justify-center rounded-lg bg-muted/30 text-xs text-muted-foreground animate-pulse">
            Rendering diagram…
          </div>
        ) : (
          <div
            className="mermaid-diagram inline-block min-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>
    </figure>
  );
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const source = chart.trim();

  if (!source) {
    return <MermaidError chart="" message="Empty diagram" />;
  }

  return <MermaidDiagramCanvas key={source} chart={source} />;
}
