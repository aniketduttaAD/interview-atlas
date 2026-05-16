import { NextRequest, NextResponse } from 'next/server';
import {
  getOpenAI,
  ADMIN_ORCHESTRATOR_PROMPT,
  ADMIN_STUB_JSON_RULES,
  chatCompletionTokenLimit,
} from '@/lib/ai/openai';
import { AI_ADMIN_GENERATE_MODEL } from '@/lib/ai/models';
import { getOpenAIApiKey } from '@/lib/env';
import { validateAdminSecret } from '@/lib/admin/require-admin-secret';
import { Question } from '@/types/question';

/**
 * STEP 1: Stub Generation
 * Generates metadata stubs (no markdownContent) for a section.
 * Fast — just the index card data for each topic.
 */

// Domain-specific topic count guidance based on the plan
const SECTION_COVERAGE_GUIDE: Record<string, string> = {
  dsa: `
COVERAGE REQUIREMENT: A complete DSA section has ~100–120 carefully curated topics.
Required categories (generate ALL topics within each):
- Arrays: Two Sum, Best Time to Buy/Sell Stock, Product Except Self, Merge Intervals, Kadane's Algorithm, Rotate Array, Majority Element, Dutch National Flag, Trapping Rain Water, Container With Most Water
- Sliding Window: Longest Substring Without Repeating, Minimum Window Substring, Maximum Sum Subarray of Size K, Permutation in String, Longest Repeating Character Replacement
- Two Pointers: Valid Palindrome, 3Sum, Remove Duplicates, Squares of Sorted Array, Sort Colors
- Binary Search: Search in Rotated Sorted Array, First and Last Position, Peak Element, Median of Two Sorted Arrays, Search a 2D Matrix, Find Minimum in Rotated Array
- Linked List: Reverse Linked List, Detect Cycle (Floyd's), Merge K Sorted Lists, LRU Cache, Remove Nth Node from End, Add Two Numbers
- Stack/Queue: Valid Parentheses, Min Stack, Next Greater Element, Monotonic Stack, Sliding Window Maximum, Daily Temperatures, Decode String
- Trees/BST: Level Order Traversal, LCA, Diameter of Binary Tree, Validate BST, Serialize/Deserialize, Path Sum, Invert Binary Tree, Right Side View, Binary Tree Maximum Path Sum
- Heap/Priority Queue: Kth Largest Element, Top K Frequent Elements, Merge K Sorted Lists, Find Median from Data Stream, Task Scheduler
- Graphs: BFS/DFS traversal, Number of Islands, Clone Graph, Topological Sort, Course Schedule I & II, Dijkstra's Algorithm, Union-Find / Disjoint Set, Pacific Atlantic Water Flow, Word Ladder
- Backtracking: N Queens, Combination Sum I & II, Permutations, Subsets, Word Search, Palindrome Partitioning, Letter Combinations of Phone Number
- Greedy: Jump Game I & II, Gas Station, Task Scheduler, Meeting Rooms, Merge Intervals (greedy approach), Non-overlapping Intervals
- Dynamic Programming: Climbing Stairs, House Robber I & II, Coin Change, Longest Increasing Subsequence, Edit Distance, Unique Paths, Knapsack 0/1, Longest Common Subsequence, Word Break, Decode Ways, Maximum Product Subarray
- Trie: Implement Trie, Add and Search Word, Word Search II
- Bit Manipulation: Single Number, Counting Bits, Number of 1 Bits, Missing Number, Reverse Bits, XOR Tricks
`,
  lld: `
COVERAGE REQUIREMENT: A complete LLD section has ~20–25 topics covering all common machine coding problems.
Required topics (generate ALL):
Parking Lot, Elevator System, Logger with Rate Limiting, Token Bucket Rate Limiter, ATM Machine, Vending Machine, Library Management System, Tic Tac Toe, Snake & Ladder, Splitwise/Expense Sharing, Notification System, URL Shortener, Cab Booking System, Food Delivery System, Chat System, File Storage System, API Rate Limiter (Sliding Window), LRU Cache, LFU Cache, Job Scheduler / Task Queue, Distributed Lock Manager, Hotel Booking System, Movie Ticket Booking, Online Shopping Cart, Publisher-Subscriber System
`,
  hld: `
COVERAGE REQUIREMENT: A complete HLD section has ~40–50 topics combining fundamentals and design problems.
Fundamentals (generate ALL): Scalability Patterns, CAP Theorem deep-dive, Load Balancing strategies, Consistent Hashing, Database Sharding strategies, Replication (sync vs async), Caching strategies (Cache-Aside, Write-Through, Write-Behind, Read-Through), CQRS pattern, Event Sourcing, Distributed Locks, Idempotency in distributed systems, Consensus algorithms basics, Leader Election, API Gateway patterns, REST vs gRPC vs GraphQL, WebSocket at scale, CDN architecture, Service Mesh (Istio), Kubernetes networking basics
Design problems (generate ALL): URL Shortener, WhatsApp/Chat System, YouTube/Video Streaming, Instagram Feed/Timeline, Uber/Ride Sharing, Netflix Content Delivery, Notification System (push/email/SMS), Search Autocomplete/Typeahead, Distributed Cache (Redis Cluster), Payment System, Logging Platform, Metrics/Monitoring Platform, Event-Driven Architecture, Multi-tenant SaaS Architecture, Web Crawler, Rate Limiter service, Distributed ID Generator (Snowflake), Content Moderation System
`,
  behavioral: `
COVERAGE REQUIREMENT: A complete behavioral section has ~20–30 STAR scenario topics.
Required scenarios (generate ALL): Conflict with a teammate, Disagreement with manager on technical decision, Owning a production incident, Leading a zero-downtime migration, Handling a team member missing deadlines, Mentoring a struggling junior engineer, Delivering bad news to stakeholders, Making a build vs buy decision, Cross-team collaboration breakdown, Technical debt escalation, Scope creep management, Navigating ambiguous requirements, Hiring and bar-raising experience, Handling a reorg or layoffs, Driving adoption of a new technology, Post-mortem leadership after a major outage, Managing conflicting priorities, Influencing without authority, Leading during a company crisis, Advocating for your team's capacity
`,
  javascript: `
COVERAGE REQUIREMENT: ~25–35 senior JS/TS interview topics.
Concepts: Event Loop, Closures, Hoisting, this binding, Prototypes & inheritance, Async/Await internals, Promises, Debounce/Throttle, Memory leaks, Garbage Collection, ES6+ features, Functional programming, Currying, Deep clone, Polyfills.
Coding: Implement debounce, Promise.all polyfill, Flatten object, Deep clone, Event emitter, Retry with exponential backoff.
`,
  react: `
COVERAGE REQUIREMENT: ~25–35 senior React topics.
Concepts: Reconciliation, Virtual DOM, Fiber, Rendering lifecycle, Hooks internals, useEffect patterns, useMemo/useCallback/memo, Context vs external state, Suspense, Server Components, React Query, Micro-frontends, hydration, concurrent features.
Coding: Infinite scroll, Debounced search, Dynamic forms, Virtualized list, Data table, Modal manager.
`,
  golang: `
COVERAGE REQUIREMENT: ~30–40 topics across categories (match existing golang categories in the repo).
Concurrency: Goroutines vs OS threads, Channels, Select, sync.Mutex vs RWMutex, WaitGroups, Context propagation & cancellation.
Patterns: Worker pools, Rate limiter, Graceful shutdown, Concurrent file processor, Fan-out/fan-in.
Core: Interfaces (implicit), Error handling patterns, Memory model, GC basics, gRPC introduction, System patterns (circuit breaker, bulkhead).
`,
  databases: `
COVERAGE REQUIREMENT: ~30–40 topics.
PostgreSQL: B-Tree/GIN/GiST indexes, MVCC, isolation levels, EXPLAIN ANALYZE, query optimization, partitioning, vacuum.
MongoDB: Aggregation pipeline, replication, sharding, schema design for reads/writes.
Redis: Data structures, pub/sub, cache-aside, rate limiting, distributed locks, RDB vs AOF.
2026: pgvector, vector search basics for RAG-backed apps.
`,
  kafka: `
COVERAGE REQUIREMENT: ~20–25 topics.
Kafka: partitions, consumer groups, offset management, ordering, exactly-once, rebalancing, compaction, retention, producer acks.
RabbitMQ: exchanges, routing, DLQ, ack modes, retry queues.
Patterns: Outbox, Saga, fan-out, idempotent consumers.
`,
  cloud: `
COVERAGE REQUIREMENT: ~35–45 topics.
AWS: EC2, S3, CloudFront, ALB/NLB, Route53, IAM, ECS/EKS, Lambda, SQS/SNS, RDS, ElastiCache, VPC.
Docker: layers, multi-stage builds, networking, volumes.
Kubernetes: Pods, Deployments, Services, Ingress, ConfigMaps, Secrets, HPA, StatefulSets, PVCs, RBAC.
GitOps/ArgoCD, LGTM observability (Loki, Grafana, Tempo, Mimir), SLI/SLO/SLA.
`,
  ai: `
COVERAGE REQUIREMENT: ~30–40 modern AI engineering topics (production focus, not ML theory).
LLM: tokens, embeddings, context windows, RAG vs fine-tuning, quantization, prompt engineering (CoT, ReAct).
RAG: chunking, retrieval, re-ranking, hallucination mitigation, vector DBs (pgvector, Pinecone, Weaviate).
Agents: tool calling, multi-agent orchestration, memory, LangGraph-style workflows, MCP.
Ops: inference scaling, GPU economics, KV cache, streaming vs batching, LLM observability, prompt injection, evaluation (RAGAS, LLM-as-judge).
`,
};

const STUB_SYSTEM_PROMPT = `${ADMIN_ORCHESTRATOR_PROMPT}\n\n${ADMIN_STUB_JSON_RULES}`;

function buildStubContextMessage(
  section: string,
  currentContent: Question[],
): string {
  const existingTopics = currentContent
    .map((q) => `- [${q.category}] ${q.title} (${q.difficulty})`)
    .join('\n');
  const existingCategories = [
    ...new Set(currentContent.map((q) => q.category)),
  ];

  const sectionKey = section.toLowerCase();
  const coverageGuide = SECTION_COVERAGE_GUIDE[sectionKey] || '';

  return `
## SECTION: "${section}"

### Current State
**Topics already generated (${currentContent.length})**: ${existingCategories.join(', ') || 'None'}

${existingTopics || 'No topics yet — this is a fresh section. Generate the complete curriculum.'}

---

${coverageGuide ? `### Coverage Requirements\n${coverageGuide}\n---` : ''}

### MANDATORY JSON SCHEMA (every item MUST conform exactly):
\`\`\`json
{
  "id": "${section}-categoryslug-topicslug",
  "section": "${section}",
  "category": "Category Name",
  "title": "Topic Title",
  "slug": "url-safe-unique-slug",
  "difficulty": "easy | medium | hard",
  "pattern": "Primary concept or pattern",
  "companies": ["Company1", "Company2"],
  "tags": ["tag1", "tag2"],
  "markdownPath": "${section}/category-slug/slug.md",
  "timeComplexity": "O(n) — DSA topics only, OMIT for all others",
  "spaceComplexity": "O(1) — DSA topics only, OMIT for all others",
  "frequency": "very-high | high | medium | low",
  "addedAt": "ISO 8601 date"
}
\`\`\`

CRITICAL: DO NOT include a "markdownContent" field. This endpoint generates stubs only.
Return: { "items": [ ...stubs... ] }
  `.trim();
}

const VALID_FREQUENCIES = ['very-high', 'high', 'medium', 'low'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

function sanitizeStub(item: Partial<Question>, section: string): Question {
  const categorySlug = (item.category || 'general')
    .toLowerCase()
    .replace(/[\s\/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  const slug =
    item.slug ||
    (item.title || 'untitled')
      .toLowerCase()
      .replace(/[\s\/]+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  return {
    id: item.id || `${section}-${categorySlug}-${slug}`,
    section: item.section || section,
    category: item.category || 'General',
    title: item.title || 'Untitled',
    slug,
    difficulty: VALID_DIFFICULTIES.includes(item.difficulty ?? '')
      ? (item.difficulty as Question['difficulty'])
      : 'medium',
    pattern: item.pattern || '',
    companies: Array.isArray(item.companies) ? item.companies : [],
    tags: Array.isArray(item.tags) ? item.tags : [],
    markdownPath: item.markdownPath || `${section}/${categorySlug}/${slug}.md`,
    ...(item.timeComplexity ? { timeComplexity: item.timeComplexity } : {}),
    ...(item.spaceComplexity ? { spaceComplexity: item.spaceComplexity } : {}),
    frequency: VALID_FREQUENCIES.includes(item.frequency ?? '')
      ? (item.frequency as Question['frequency'])
      : 'medium',
    addedAt: item.addedAt || new Date().toISOString(),
  } as Question;
}

export async function POST(req: NextRequest) {
  const authError = validateAdminSecret(req);
  if (authError) return authError;

  try {
    const { prompt, currentContent, section } = await req.json();

    if (!section || !prompt) {
      return NextResponse.json(
        { error: 'section and prompt are required.' },
        { status: 400 },
      );
    }

    if (!getOpenAIApiKey()) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured.' },
        { status: 503 },
      );
    }

    const contextMessage = buildStubContextMessage(
      section,
      currentContent || [],
    );

    const userMessage = `
## USER INSTRUCTION
${prompt}

## YOUR TASK
Execute the instruction on section "${section}".

### Action Rules:
1. **"generate" / "create" / "populate" / "fill"** → Generate the COMPLETE, COMPREHENSIVE list of senior-level topic stubs for this section. Cover EVERY important category. Do NOT stop early. Do NOT cap yourself. Use the Coverage Requirements above as your target. If the section is fresh, aim for full coverage as specified.
2. **"add [specific topic]"** → Add only the specified topics. DO NOT duplicate topics that already exist in the current state.
3. **"remove [topic]"** → Remove the specified topics, return the remaining complete list.
4. **"reorder"** → Reorder by priority/frequency without changing any metadata.
5. **"extend" / "more"** → Add topics that are missing from the current state to make the section more complete.

### Quality Rules (mandatory for all actions):
- Each topic title must be professional and interview-focused (e.g., "Goroutines vs OS Threads" not "What are goroutines?")
- Difficulty tagging: easy = core pattern every senior knows, medium = architectural implementation, hard = complex tradeoff or scaling problem
- Companies field: include 2–5 real companies known to ask this topic
- Tags: 3–5 relevant keywords for filtering
- Frequency: very-high = asked at almost every FAANG loop, high = common, medium = occasionally, low = niche but important

Return ONLY valid JSON: { "items": [ ...stub objects... ] }
DO NOT include markdownContent. This endpoint is stubs only.
    `.trim();

    const response = await getOpenAI().chat.completions.create({
      model: AI_ADMIN_GENERATE_MODEL,
      messages: [
        { role: 'system', content: STUB_SYSTEM_PROMPT },
        { role: 'user', content: contextMessage },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      ...chatCompletionTokenLimit(16000),
    });

    const rawText = response.choices[0].message.content?.trim() || '{}';
    let items: Question[];

    try {
      const parsed = JSON.parse(rawText);
      items = Array.isArray(parsed)
        ? parsed
        : (parsed.items ??
          parsed.nodes ??
          parsed.questions ??
          parsed.topics ??
          []);
      if (!Array.isArray(items)) throw new Error('No array in response');
    } catch {
      const stripped = rawText.replace(/```json|```/g, '').trim();
      const fallback = JSON.parse(stripped);
      items = Array.isArray(fallback) ? fallback : (fallback.items ?? []);
    }

    const sanitized = items.map((item) => sanitizeStub(item, section));

    return NextResponse.json({ updatedContent: sanitized });
  } catch (error: unknown) {
    console.error('[Stub Gen] Failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Stub generation failed.',
      },
      { status: 500 },
    );
  }
}
