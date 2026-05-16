'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { MermaidDiagram } from './MermaidDiagram';
import { preprocessMermaidFences } from '@/lib/markdown/preprocess-mermaid';

interface MarkdownRendererProps {
  content: string;
  collapsibleCode?: boolean;
}

function isMermaidLanguage(lang: string | undefined): boolean {
  return lang?.toLowerCase() === 'mermaid';
}

export function MarkdownRenderer({
  content,
  collapsibleCode = false,
}: MarkdownRendererProps) {
  const processed = preprocessMermaidFences(content);

  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none min-w-0 w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            const lang = match?.[1];

            if (isMermaidLanguage(lang)) {
              return (
                <MermaidDiagram chart={String(children).replace(/\n$/, '')} />
              );
            }

            if (!match) {
              return (
                <code
                  className="bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono"
                  {...rest}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                language={lang!}
                code={String(children).replace(/\n$/, '')}
                collapsible={collapsibleCode}
              />
            );
          },
          table(props) {
            return (
              <div className="overflow-x-auto my-8 border border-border/50 rounded-2xl shadow-sm bg-card/30">
                <table
                  className="w-full text-sm text-left border-collapse min-w-[600px]"
                  {...props}
                />
              </div>
            );
          },
          th(props) {
            return (
              <th
                className="border-b-2 border-border p-3 font-semibold bg-muted/50"
                {...props}
              />
            );
          },
          td(props) {
            return <td className="border-b border-border p-3" {...props} />;
          },
          h2(props) {
            return (
              <h2
                className="text-xl font-bold mt-7 mb-3 border-b border-border pb-2"
                {...props}
              />
            );
          },
          h3(props) {
            return <h3 className="text-lg font-bold mt-6 mb-3" {...props} />;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
