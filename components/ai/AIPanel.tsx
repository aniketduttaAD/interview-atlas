'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Message } from '@/types/ai';
import { X, Send, User, Trash2, AlertCircle, RefreshCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';
import { useAIStore } from '@/store/aiStore';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { AI_CHAT_LIMITS } from '@/lib/ai/chat-limits';
import Image from 'next/image';

interface AIPanelProps {
  questionId: string;
  questionTitle: string;
  questionContent: string;
  sectionLabel?: string;
}

const SUGGESTED_PROMPTS = [
  {
    label: 'Senior deep-dive',
    message:
      'Give me a senior-level explanation of this topic — why it is asked, key tradeoffs, and an interview punchline.',
  },
  {
    label: 'Architectural hint',
    message:
      'Give me one high-level hint for this topic — the core insight only, not the full solution.',
  },
  {
    label: 'What gets asked?',
    message:
      'What kinds of interview questions are typically asked for this topic in this section?',
  },
  {
    label: 'Staff mock interview',
    message:
      "Let's do a mock interview on this topic. Start with one probing question.",
  },
] as const;

export function AIPanel({
  questionId,
  questionTitle,
  questionContent,
  sectionLabel,
}: AIPanelProps) {
  const {
    panelOpen,
    closePanel,
    messages,
    addMessage,
    clearHistory,
    loading,
    setLoading,
    error,
    setError,
  } = useAIStore();
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const online = useOnlineStatus();

  const history = useMemo(
    () => messages[questionId] || [],
    [messages, questionId],
  );

  useEffect(() => {
    if (panelOpen) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history.length, panelOpen]);

  const sendChat = async (userMessage: string, priorHistory: Message[]) => {
    if (!online) {
      setError('AI assistant needs an internet connection.');
      return;
    }
    if (userMessage.length > AI_CHAT_LIMITS.maxUserMessageChars) {
      setError('Message is too long.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionTitle,
          questionContent,
          sectionLabel,
          userMessage,
          history: priorHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'AI request failed');
      }

      addMessage(questionId, {
        role: 'assistant',
        content: data.reply || 'No response.',
      });
    } catch (e: unknown) {
      const message = !navigator.onLine
        ? 'You are offline. AI assistant needs internet.'
        : e instanceof Error
          ? e.message
          : 'AI request failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedPrompt = (message: string) => {
    addMessage(questionId, {
      role: 'user',
      content: message,
    });
    sendChat(message, history);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');

    addMessage(questionId, {
      role: 'user',
      content: userMsg,
    });

    sendChat(userMsg, history);
  };

  if (!panelOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] md:w-[450px] bg-card border-l shadow-[0_0_40px_rgba(0,0,0,0.3)] flex flex-col z-[60] transform transition-transform duration-300 animate-in slide-in-from-right">
      <div className="h-12 flex items-center justify-between px-4 border-b bg-background/95 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt="Atlas"
            width={18}
            height={18}
            className="brightness-110 group-hover:scale-110 transition-all shrink-0"
          />
          <span className="font-extrabold text-xs tracking-tighter uppercase bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-400 bg-clip-text text-transparent whitespace-nowrap">
            Interview Atlas <span className="opacity-80">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear chat history?')) clearHistory(questionId);
              }}
              className="p-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
              title="Clear history"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={closePanel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-muted text-foreground transition-all border border-border/50 group"
          >
            <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-primary">
              Close Assistant
            </span>
            <X
              size={14}
              className="group-hover:rotate-90 transition-transform"
            />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 text-muted-foreground">
            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/10 shadow-sm">
              <Image src="/icon.png" alt="Atlas" width={32} height={32} />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-foreground text-sm tracking-tight">
                Topic study assistant
              </p>
              <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                {online
                  ? 'Ask for clarity, hints, what interviewers probe, or a mock exchange — all grounded in this topic and section.'
                  : 'You are offline. Study content still works; connect to use the AI assistant.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full px-4">
              {SUGGESTED_PROMPTS.map((item, i) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={!online || loading}
                  onClick={() => handleSuggestedPrompt(item.message)}
                  className={clsx(
                    'flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all border group',
                    i === SUGGESTED_PROMPTS.length - 1
                      ? 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                      : 'bg-secondary/50 hover:bg-secondary text-secondary-foreground border-border/50',
                  )}
                >
                  <span>{item.label}</span>
                  <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {history.map((msg: Message, i: number) => (
              <div
                key={i}
                className={clsx(
                  'flex gap-3 max-w-[90%]',
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto',
                )}
              >
                <div
                  className={clsx(
                    'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 overflow-hidden border',
                    msg.role === 'user'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-indigo-100 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800',
                  )}
                >
                  {msg.role === 'user' ? (
                    <User size={12} />
                  ) : (
                    <Image
                      src="/icon.png"
                      alt="Atlas"
                      width={24}
                      height={24}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div
                  className={clsx(
                    'p-1 px-1 rounded-xl text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'text-foreground font-semibold'
                      : 'text-foreground prose prose-sm dark:prose-invert max-w-none',
                  )}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 max-w-[90%] mr-auto">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 border flex items-center justify-center shrink-0 mt-1 overflow-hidden">
                  <Image
                    src="/icon.png"
                    alt="Atlas"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 rounded-2xl bg-secondary rounded-tl-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                  <div
                    className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/10 dark:text-red-400 rounded-md">
                <AlertCircle size={16} className="shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                >
                  <RefreshCcw size={14} />
                </button>
              </div>
            )}

            <div ref={endOfMessagesRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t bg-card shrink-0">
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
            placeholder={
              online ? 'Ask about this topic...' : 'Offline — AI needs internet'
            }
            className="w-full bg-background border rounded-2xl pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[44px] max-h-32"
            disabled={loading || !online}
            rows={1}
            maxLength={AI_CHAT_LIMITS.maxUserMessageChars}
          />
          <button
            onClick={() =>
              handleSubmit({ preventDefault: () => {} } as React.FormEvent)
            }
            disabled={!input.trim() || loading || !online}
            className="absolute right-2 bottom-2.5 p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
