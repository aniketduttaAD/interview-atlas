'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
  collapsibleCode?: boolean;
}

export function MarkdownRenderer({
  content,
  collapsibleCode = false,
}: MarkdownRendererProps) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');

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
                language={match[1]}
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
        {content}
      </ReactMarkdown>
    </div>
  );
}
