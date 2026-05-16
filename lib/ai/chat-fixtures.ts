/**
 * Inline topic fixtures for scripts/verify-chat-relevance.ts.
 * Mirrors Blob-backed markdown shape — no local content/ pool files.
 */
export const CHAT_VERIFY_TOPIC = {
  questionTitle: 'Implementing Worker Pool',
  sectionLabel: 'Golang Concurrency Patterns',
  questionContent: `
# Implementing Worker Pool

## Concept Summary

A worker pool delegates tasks to a fixed number of goroutines, capping concurrency and
improving throughput under load. It is used for background processing, request handling,
and controlled parallelism.

## Why Seniors Are Asked This

Evaluates system design for concurrent workloads, resource limits, and reliability.
Senior engineers must tune pool size, handle backpressure, and design graceful shutdown.

## Tradeoff Matrix

| Fixed Pool Size | Dynamic Pool Sizing |
| Fixed size is simple | Dynamic sizing adapts to load |
| May waste resources | Adds operational complexity |

## Production Scars

- Task starvation without fair scheduling
- Goroutine leaks if shutdown is not handled
- Thundering herd when all workers wake at once
`.trim(),
} as const;
