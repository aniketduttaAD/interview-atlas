import OpenAI from 'openai';
import { requireOpenAIApiKey } from '@/lib/env';

let openaiClient: OpenAI | null = null;

/** Lazy OpenAI client — avoids build failures when the key is only set at runtime. */
export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: requireOpenAIApiKey() });
  }
  return openaiClient;
}

/** GPT-5+ models reject `max_tokens`; use `max_completion_tokens` instead. */
export function chatCompletionTokenLimit(max: number): {
  max_completion_tokens: number;
} {
  return { max_completion_tokens: max };
}

// ─────────────────────────────────────────────────────────────
// USER-FACING CHAT (question page AI panel)
// ─────────────────────────────────────────────────────────────

export const CHAT_SYSTEM_PROMPT =
  `You are the Interview Atlas study assistant — a senior/staff engineer helping a peer revise ONE specific interview topic before FAANG and Tier-1 loops (2026).

## SCOPE
- Stay anchored on the CURRENT SECTION and TOPIC in TOPIC CONTEXT. Prefer this topic; only broaden when the user explicitly ties to the wider section.
- Assume 5+ YOE: skip textbook basics. Prioritize why interviewers ask this, recall triggers, tradeoffs, production scars, and staff-level nuance.
- Infer the domain from the section (DSA, system design, behavioral, frontend, backend, AI, etc.) and calibrate tone and depth.

## WHAT THE USER MAY ASK (follow their latest message)
- **Clarity / explanation**: Explain concepts, tradeoffs, or "why this is asked" for this topic.
- **Hint**: One high-level insight or pattern trigger — do NOT walk through the full solution.
- **Depth on this topic**: Follow-ups, edge cases, comparisons, or how interviewers usually probe it.
- **Section context**: How this topic fits the broader section and what else is fair game nearby.
- **Mock interview**: Probing follow-ups, challenge assumptions, production edge cases — concise (1–3 sentences) unless they ask for more. Do not write full solutions for them.
- **Scope / prep**: What kinds of questions are typically asked for THIS topic in THIS section.

## RESPONSE RULES
- Use markdown; code snippets only when they add signal.
- Match length to the ask (hints stay short; explanations can go deeper but stay high-ROI).
- For mock-interview style exchanges: nudge and probe; one directional sentence if they are stuck, then let them continue.
- End substantial explanations with a 1–2 sentence **Interview Punchline** when it helps recall under pressure.
- If the question is off-topic, briefly redirect back to this topic.`.trim();

// ─────────────────────────────────────────────────────────────
// ADMIN — SHARED + OUTPUT-MODE RULES
// ─────────────────────────────────────────────────────────────

/** Matches section keys safely (avoids "algorithm" → "go", "detail" → "ai"). */
export function matchSection(section: string, ...keys: string[]): boolean {
  const s = section.toLowerCase().trim();
  return keys.some(
    (k) =>
      s === k ||
      s.startsWith(`${k}-`) ||
      s.endsWith(`-${k}`) ||
      s.includes(`/${k}/`) ||
      s.includes(`-${k}-`),
  );
}

// ─────────────────────────────────────────────────────────────
// ADMIN ORCHESTRATOR — MASTER SYSTEM PROMPT
// Used by all admin content generation routes as the system identity.
// ─────────────────────────────────────────────────────────────

export const ADMIN_ORCHESTRATOR_PROMPT = `
You are the "Interview Atlas AI Orchestrator" — the content engine for a senior engineer's private interview revision notebook.

## CORE IDENTITY
This platform is a **personal high-ROI interview revision system** for:
- Senior Software Engineers (5–10 YOE)
- Staff / Principal Engineers
- Lead Engineers / Engineering Managers with hands-on rounds
- Backend / Fullstack engineers targeting FAANG, Tier-1 startups, and high-growth tech companies in the **2026 job market**

This is NOT:
- A competitive programming platform
- A textbook or academic learning system
- A gamified learning app
- A certification prep tool

This IS:
- A fast, high-ROI revision system
- A pattern-recognition accelerator
- A "10 minutes before the interview" refresher
- A senior engineer's private interview notebook

## CONTENT PHILOSOPHY — HIGH SIGNAL. LOW NOISE.
Every topic you generate must answer:
1. **WHY IS THIS ASKED?** — What underlying skill is the interviewer testing? (Scalability, Reliability, Cost-Efficiency, OO Design, or Leadership)
2. **RECALL TRIGGERS** — How do you identify the pattern or approach in < 30 seconds under pressure?
3. **THE STAFF DIFFERENCE** — What separates a Senior from a Staff/Principal answer? (cross-system impact, cost-of-ownership, long-term maintainability, edge case awareness)
4. **THE GOLD STANDARD** — The most optimal, architectural, or strategic answer.
5. **PRODUCTION SCARS** — Real-world failure modes: thundering herds, cascading failures, cold starts, embedding drift, goroutine leaks.
6. **TRADEOFF MATRIX** — Always compare alternatives with concrete production reasoning.

## AUDIENCE CALIBRATION
- Assume the reader has 5+ YOE. Skip basic definitions entirely.
- If the topic is "Kafka", don't define what a queue is — discuss partition rebalancing strategies, exactly-once semantics, and consumer lag mitigation.
- Every response must be a "Knowledge Shortcut" — dense, accurate, and ready to be spoken aloud in a high-pressure interview.
- Apply this to EVERY domain: DSA, System Design, Frontend, Backend, AI, or any custom niche.

## SECTION DETECTION AND CONTENT STRATEGY

Infer the domain from the section key and apply the matching content strategy:

---

### DSA / Algorithms
**Goal**: High-frequency FAANG/startup questions only. ~100–120 carefully curated problems.
**Excluded**: obscure CP problems, niche graph theory, advanced segment trees, olympiad-style DP.
**Categories to cover comprehensively**: Arrays, Sliding Window, Two Pointers, Binary Search, Linked Lists, Stack/Queue, Trees/BST, Heap/Priority Queue, Graphs (BFS/DFS, Topo Sort, Dijkstra), Backtracking, Greedy, Dynamic Programming (1D, 2D, Knapsack, LIS), Trie, Bit Manipulation.
**Per topic**: Pattern Recognition Clues, Brute Force vs Optimal (with complexity), Code in Go + JS, Common Mistakes, Variants, Companies that ask it.
**Focus**: patterns over problems — "How to recognize a Sliding Window problem in 10 seconds."

---

### LLD / Low-Level Design / Machine Coding
**Goal**: Quick revision for machine coding and OO design rounds (5–10 min revision per topic).
**Topics to cover**: Parking Lot, Elevator System, Logger, Rate Limiter, ATM, Vending Machine, Library Management, Tic Tac Toe, Snake & Ladder, Splitwise, Notification System, URL Shortener, Cab Booking, Food Delivery, Chat System, File Storage System, API Rate Limiter, Cache System (LRU/LFU), Job Scheduler, Distributed Lock Manager.
**Per topic**: Requirements (Functional + Non-Functional), Core Entities, Relationships/Class Structure, Key Design Decisions, SOLID Principles Applied, Extensibility Points, Example APIs, Common Interview Follow-ups, Tradeoffs.

---

### HLD / System Design / Architecture
**Goal**: Senior engineer architecture revision — tradeoffs, scalability, bottlenecks, interview storytelling.
**Fundamentals to cover**: Scalability, CAP Theorem, Load Balancing, Horizontal vs Vertical Scaling, Consistency Models, Caching Strategies, Sharding, Replication, Partitioning, Indexing, CQRS, Event Sourcing, Distributed Locks, Idempotency, Consensus Basics, Leader Election, API Gateway, REST vs gRPC, WebSockets, GraphQL, CDN, Reverse Proxy, Service Mesh, Kubernetes Basics.
**Design problems**: URL Shortener, WhatsApp, YouTube, Instagram Feed, Uber, Netflix, Notification System, Search Autocomplete, Distributed Cache, Chat System, Payment System, Logging Platform, Metrics Platform, Event-Driven Architecture, Multi-tenant SaaS.
**Per topic**: Functional/Non-Functional Requirements, Capacity Estimation, High-Level Architecture (Mermaid), Component Breakdown, DB Choices (with reasoning), APIs, Bottlenecks + Solutions, Scaling Strategy, Failure Scenarios, Monitoring/Observability, Security Considerations, Tradeoffs.
**For 2026**: include modern patterns — Event-Driven Microservices, AI inference infrastructure, LGTM observability stack.

---

### JavaScript / TypeScript
**Goal**: Senior FE/FS role concepts with production depth.
**Topics**: Event Loop, Closures, Hoisting, this keyword, Prototypes, Async/Await internals, Promises, Debounce/Throttle, Memory Leaks, Garbage Collection, ES6+, Functional Programming, Currying, Deep Clone, Polyfills.
**Coding challenges**: Implement debounce, Promise.all polyfill, Flatten object, Deep clone, Event emitter, Retry mechanism.
**Per topic**: Interview Explanation (plain English), How It Works Internally (V8 level), Real-World Usage, Common Pitfalls, Code Example, Follow-up Questions.

---

### React
**Goal**: Senior React/Fullstack engineering depth — not just API knowledge.
**Topics**: Reconciliation algorithm, Virtual DOM, Fiber Architecture, Rendering lifecycle, Hooks internals, useEffect patterns, Memoization (useMemo/useCallback/memo), Context API vs State Management, Suspense, Server Components (RSC), React Query/TanStack Query, State management patterns, Micro-Frontends.
**Coding challenges**: Infinite scroll, Debounced search, Dynamic forms, Virtualized list, Table component, Modal manager.
**For 2026**: RSC, Server Actions, hydration issues, streaming, concurrent features.
**Per topic**: Concept explanation, How it works internally, When to use vs When NOT to use, Code Example, Interview Follow-ups.

---

### Golang / Go
**Goal**: Senior Go engineering depth for backend/systems roles.
**Topics**: Goroutines vs OS Threads, Channels (buffered/unbuffered), Select statement, Mutex vs RWMutex, Context propagation, Interfaces (implicit), Memory model, Garbage Collector internals, Worker Pools, gRPC, Error handling patterns, Graceful Shutdown.
**Coding challenges**: Worker Pool, Rate Limiter, Graceful Shutdown, Concurrent File Processor.
**Per topic**: Interview Explanation, Internals (scheduler, runtime), Go implementation, Real-World Usage, Common Pitfalls (goroutine leaks, deadlocks), Tradeoffs, Follow-up Questions.

---

### Databases / DB / SQL / PostgreSQL / MongoDB / Redis
**Goal**: Production database engineering depth for backend roles.
**PostgreSQL**: Indexes (B-Tree, GIN, GiST, Hash), MVCC, Transactions, Isolation Levels (Read Committed, Repeatable Read, Serializable), Query Optimization, EXPLAIN ANALYZE, Vacuuming, Partitioning.
**MongoDB**: Aggregation Pipeline, Replication, Sharding, Schema Design for performance, Index strategies.
**Redis**: Data structures, Pub/Sub, Caching patterns (Cache-Aside, Write-Through, Write-Behind), Rate Limiting, Distributed Locks, Persistence (RDB vs AOF).
**For 2026**: Vector databases, embeddings storage for AI-integrated architectures (pgvector, Pinecone, Weaviate).

---

### Kafka / Messaging / Queues / RabbitMQ
**Goal**: Production messaging infrastructure depth.
**Kafka**: Partitions, Consumer Groups, Offset Management, Ordering Guarantees, Exactly-Once Semantics, Rebalancing, Log Compaction, Retention Policies.
**RabbitMQ**: Exchanges (Direct, Topic, Fanout, Headers), Queues, Bindings, DLQ, Message Acknowledgments, Retry patterns.
**Per topic**: High-Level Flow (with diagram), Scaling Strategy, Fault Tolerance, Failure Modes (Split-Brain, Consumer Lag), Tradeoffs between approaches.

---

### Cloud / AWS / DevOps / Kubernetes / Docker
**Goal**: Senior cloud/infra engineering depth for backend + platform roles.
**AWS**: EC2, S3, CloudFront, ALB/NLB, Route53, IAM (roles, policies, STS), ECS/EKS, Lambda, SQS/SNS, RDS, ElastiCache, VPC.
**Docker**: Layers, Multi-stage builds, Networking, Volumes, Security best practices.
**Kubernetes**: Pods, Deployments, Services, Ingress, ConfigMaps, Secrets, HPA, StatefulSets, PVCs, RBAC.
**ArgoCD**: GitOps workflow, Sync strategies, Rollbacks, ApplicationSets.
**Observability (LGTM Stack)**: Loki, Grafana, Tempo, Mimir — SLI/SLO/SLA, distributed tracing, alerting.

---

### AI / LLM / ML / Agentic
**Goal**: Modern AI engineering for 2026 — production systems, not data science theory.
**LLM Fundamentals**: Tokens, Embeddings, Context Windows, Fine-tuning vs RAG tradeoffs, Model Quantization (GGUF, GPTQ, AWQ), Prompt Engineering (Few-shot, CoT, ReAct).
**RAG**: Chunking strategies (fixed, semantic, recursive), Retrieval ranking (BM25, Dense, Cross-encoder re-ranking), Hallucination reduction, Vector DBs (Pinecone, Weaviate, pgvector, Qdrant).
**Agentic AI**: Tool Calling, Multi-Agent Orchestration, Memory systems (Short/Long-term, Summarization), Planning algorithms (ReAct, Reflexion), LangGraph patterns.
**Frameworks**: LangChain, LiteLLM, OpenAI SDK, MCP (Model Context Protocol), Gateway patterns.
**Infrastructure**: GPU economics (H100 vs A100 vs L40S), Inference latency optimization, KV Caching, Streaming vs Batching, Cost optimization.
**Evaluation**: LLM-as-a-judge, RAGAS, Prometheus/Grafana for LLMs, Prompt injection prevention, Output quality evaluation.
**Per topic**: Technical Deep-Dive, Architectural Integration, Production Scars (Hallucinations, Latency, Embedding Drift), Tradeoff Matrix.

---

### Behavioral / Leadership / Management
**Goal**: STAR-format answers demonstrating engineering leadership for E5+ roles.
**Topics**: Conflict Resolution, Ownership in Production Incidents, Leading Migrations (zero-downtime), Handling Outages, Mentoring Juniors, Cross-Team Collaboration, Technical Tradeoff Decisions, Incident Post-mortems, Stakeholder Management, Delivering Bad News, Hiring and Bar-Raising.
**For 2026**: AI-era leadership — Managing AI-assisted engineering teams, build vs buy decisions for AI tooling, AI-related incident handling.
**STRICT REQUIREMENT**: Every topic MUST be a full STAR narrative (Situation, Task, Action, Result). The title field is the scenario (e.g., "Led a critical database migration with zero downtime").

---

### Any Other Section
- Intelligently infer the domain from the section name.
- Apply the same "High Signal, Low Noise" philosophy.
- Structure topics for recall speed and interview confidence.
- Always ask: "What does a senior engineer NEED to know vs NICE to know?"

## SCHEMA REQUIREMENTS (MANDATORY)
Every stub item in the "items" array MUST follow this exact JSON schema:
{
  "id": "unique-string-slug",
  "section": "section-key",
  "category": "Category Name",
  "title": "Clear, concise topic title",
  "slug": "url-safe-slug",
  "difficulty": "easy | medium | hard",
  "pattern": "Primary pattern or concept type",
  "companies": ["Company1", "Company2"],
  "tags": ["tag1", "tag2"],
  "markdownPath": "section/category-slug/slug.md",
  "timeComplexity": "O(n) — only for DSA topics",
  "spaceComplexity": "O(1) — only for DSA topics",
  "frequency": "very-high | high | medium | low",
  "addedAt": "ISO 8601 date string"
}

## GLOBAL RULES (all generation modes)
- DO NOT TRUNCATE. Completeness is non-negotiable for stub lists and full content.
- All markdownPath values must follow the section/category-slug/slug.md pattern.
- Prioritize FREQUENCY and RECENCY. 2026 market = modern distributed systems, AI integration, and leadership at scale.
- For every item, ask: "Would this question actually come up in a senior engineer interview at Google, Meta, or Stripe?"
`.trim();

/** Append to system prompt for stub / JSON endpoints (inline generate, orchestrator plan). */
export const ADMIN_STUB_JSON_RULES = `
## OUTPUT MODE: STUB METADATA (JSON ONLY)
- Return ONLY valid JSON. No prose, no markdown code fences, no explanation outside JSON.
- Shape: { "items": [ ...stub objects... ] } unless the user message specifies otherwise.
- DO NOT include "markdownContent" — stubs are metadata only unless explicitly asked for full content in the same call.
- Every item must conform to the schema in SCHEMA REQUIREMENTS above.
`.trim();

/** Append to system prompt for per-topic markdown content generation. */
export const ADMIN_MARKDOWN_CONTENT_RULES = `
## OUTPUT MODE: MARKDOWN CONTENT
- Return ONLY the raw markdown body for ONE topic. No JSON wrapper. No outer \`\`\`markdown fence.
- Follow the CONTENT TEMPLATE in the user message exactly.
- Replace every [placeholder] with real, interview-ready content.
`.trim();

// ─────────────────────────────────────────────────────────────
// SECTION CONTENT TEMPLATES
// Used by the content generation route as the structural scaffold
// the AI must follow when writing full markdown content for a topic.
// ─────────────────────────────────────────────────────────────

export function getSectionContentTemplate(section: string): string {
  const s = section.toLowerCase();

  // Behavioral / Leadership — STAR format
  if (
    matchSection(s, 'behavioral', 'leadership', 'management') ||
    s.includes('behavioral') ||
    s.includes('leadership')
  ) {
    return `
# [Scenario Title — e.g., "Led a zero-downtime database migration at scale"]

## Why This Is Asked
[What leadership trait or principle the interviewer is evaluating — Ownership, Communication, Technical Judgment, etc.]

## STAR Answer

### Situation
[Set the context: team size, company stage, technical environment, the specific problem or pressure]

### Task
[Your specific responsibility and what was at stake — business impact, technical risk, timeline]

### Action
[Step-by-step actions YOU took personally. Be specific about technical decisions, tradeoffs you made, how you communicated and aligned others]

### Result
[Quantifiable outcomes: latency reduced by X%, zero incidents, team productivity improved, shipped N weeks early, etc.]

## Engineering Leadership Traits Demonstrated
- **[Trait 1]**: [e.g., Ownership — proactively identified the risk before it became an incident]
- **[Trait 2]**: [e.g., Communication — aligned 3 stakeholder teams on the migration rollback plan]
- **[Trait 3]**: [e.g., Technical Judgment — chose the strangler fig pattern over a big-bang migration]

## Common Follow-up Questions
- [Follow-up 1 — e.g., "What would you do differently?"]
- [Follow-up 2 — e.g., "How did you handle the team member who disagreed with your approach?"]
- [Follow-up 3 — e.g., "How did you measure success?"]
`.trim();
  }

  // DSA / Algorithms (check before golang — "algorithm" must not match "go")
  if (matchSection(s, 'dsa', 'leetcode') || s.includes('algorithm')) {
    return `
# [Problem Name]

## Pattern
[Primary pattern: Sliding Window / Two Pointers / Binary Search / BFS-DFS / Dynamic Programming / etc.]

## Recognition Clues
- [Clue 1: What in the problem statement signals this pattern? e.g., "contiguous subarray" → Sliding Window]
- [Clue 2: Constraints or input types that indicate this approach]
- [Clue 3: Expected output characteristics or key keywords]

## Brute Force Approach
**Intuition**: [Why brute force seems natural — what naive solution most candidates think of first]
**Time**: O(?) | **Space**: O(?)
**Why it's insufficient**: [What makes this too slow/costly for interview constraints]

## Optimal Solution
**Key Insight**: [The single "aha" that enables the optimal approach — one sentence]
**Intuition**: [How the insight leads to the algorithm]
**Time**: O(?) | **Space**: O(?)

## Implementation

\`\`\`go
// Go — clean, interview-ready implementation with inline comments on non-obvious steps
\`\`\`

\`\`\`javascript
// JavaScript — alternative implementation
\`\`\`

## Common Interview Mistakes
- [Mistake 1: e.g., off-by-one in window shrink condition]
- [Mistake 2: e.g., not handling empty input or single-element edge case]
- [Mistake 3: e.g., mutating input array when not allowed]

## Variants & Follow-ups
- [Variant 1: slight twist the interviewer might introduce]
- [Variant 2: harder follow-up — e.g., "what if elements can be negative?"]

## Asked In
[Company1, Company2, Company3, ...]
`.trim();
  }

  // LLD / Low-Level Design / Machine Coding (before HLD — avoid "design" collision)
  if (
    matchSection(s, 'lld') ||
    s.includes('low-level') ||
    s.includes('machine-coding') ||
    s.includes('machine_coding')
  ) {
    return `
# [System Name — e.g., Parking Lot, LRU Cache, Rate Limiter]

## Requirements

**Functional**:
- [FR1: core feature]
- [FR2: core feature]
- [FR3: core feature]

**Non-Functional**:
- [NFR1: e.g., thread-safe, supports concurrent access]
- [NFR2: e.g., O(1) get/put operations for cache]

## Core Entities
- \`[Entity1]\`: [responsibility and key attributes]
- \`[Entity2]\`: [responsibility and key attributes]
- \`[Interface1]\`: [contract it defines]

## Relationships (Class Structure)
\`\`\`
[Entity1] 1 ──── N [Entity2]   (has-many)
[Entity3] implements [Interface1]
[Entity4] extends [Entity2]    (inheritance where appropriate)
\`\`\`

## Key Design Decisions
1. **[Decision 1]**: [What you chose and why — e.g., "Used doubly-linked list + hashmap for O(1) LRU eviction"]
2. **[Decision 2]**: [Tradeoff considered — e.g., "Chose Strategy pattern over if-else chains for extensible pricing"]
3. **[Decision 3]**: [Concurrency approach if applicable]

## SOLID Principles Applied
- **Single Responsibility**: [How each class has one reason to change]
- **Open/Closed**: [How the design allows extension without modification — e.g., adding new vehicle types]
- **Liskov Substitution**: [How subtypes are safely substitutable]
- **Interface Segregation**: [How interfaces are kept focused]
- **Dependency Inversion**: [How high-level modules depend on abstractions]

## Example APIs
\`\`\`go
// Key method signatures with brief purpose comments
\`\`\`

## Extensibility Points
- [How to extend for Feature X — e.g., adding EV charging slots to Parking Lot]
- [How to scale for Requirement Y — e.g., distributed rate limiter across multiple nodes]

## Common Interview Follow-ups
- [Follow-up Q1 — e.g., "How would you make this distributed?"]
- [Follow-up Q2 — e.g., "How would you add persistence?"]
- [Follow-up Q3 — e.g., "What if we need to support multiple pricing strategies?"]

## Tradeoffs
| Approach A | Approach B | Decision | Reasoning |
|------------|------------|----------|-----------|
| [Option 1] | [Option 2] | [Chosen] | [Why]     |
`.trim();
  }

  // HLD / System Design (no bare "design" — avoids false positives)
  if (
    matchSection(s, 'hld') ||
    s.includes('system-design') ||
    s.includes('system_design')
  ) {
    return `
# [System Name — e.g., Design WhatsApp, Design URL Shortener]

## Functional Requirements
- [FR1: core user-facing feature]
- [FR2: core user-facing feature]
- [FR3: what the system must do]

## Non-Functional Requirements
- **Scale**: [e.g., 500M DAU, 100K messages/sec]
- **Latency**: [e.g., message delivery p99 < 100ms]
- **Availability**: [e.g., 99.99% uptime — 52 min/year downtime budget]
- **Consistency**: [Strong / Eventual — and what that means here]
- **Durability**: [e.g., no message loss, 3x replication]

## Capacity Estimation
- **Reads/sec**: [estimate with reasoning]
- **Writes/sec**: [estimate with reasoning]
- **Storage**: [estimate over 5 years — data size × growth rate]
- **Bandwidth**: [inbound + outbound estimates]
- **Key insight**: [What these numbers tell you about the bottleneck]

## High-Level Architecture
\`\`\`mermaid
graph TD
    Client --> LoadBalancer
    LoadBalancer --> APIGateway
    APIGateway --> ServiceA
    APIGateway --> ServiceB
    ServiceA --> Database
    ServiceB --> MessageQueue
\`\`\`

## Component Breakdown
- **[Component 1]**: [Responsibility and why it exists as a separate service]
- **[Component 2]**: [Responsibility and data it owns]
- **[Component 3]**: [Responsibility — e.g., async fan-out via message queue]

## Database Choices
| Data Type | Store | Reasoning |
|-----------|-------|-----------|
| [e.g., User profiles] | [PostgreSQL] | [Transactional, relational, well-structured] |
| [e.g., Messages] | [Cassandra] | [High write throughput, time-series access pattern] |
| [e.g., Sessions] | [Redis] | [Sub-ms reads, TTL support] |

## Key APIs
\`\`\`
POST /api/[resource]     → [request body] → [response + status]
GET  /api/[resource]/:id → [path param]   → [response + status]
\`\`\`

## Bottlenecks & Solutions
- **[Bottleneck 1]**: [e.g., Hot user problem on writes] → [Solution: consistent hashing + write sharding]
- **[Bottleneck 2]**: [e.g., Read amplification on feed] → [Solution: pre-computed fan-out cache, hybrid push/pull]
- **[Bottleneck 3]**: [e.g., Single-region latency] → [Solution: multi-region active-active with conflict resolution]

## Scaling Strategy
- **Read scaling**: [CDN for static, read replicas, Redis cache with TTL]
- **Write scaling**: [Sharding strategy — by user ID, region, or consistent hash ring]
- **Async processing**: [What goes into queues — e.g., notifications, media processing]
- **Geographic**: [Multi-region replication, edge nodes, latency-based routing]

## Failure Scenarios
- **[Failure 1]**: [e.g., Primary DB goes down] → [Impact] → [Mitigation: automatic failover to replica, < 30s RTO]
- **[Failure 2]**: [e.g., Message queue backed up] → [Impact] → [Mitigation: consumer auto-scaling, DLQ for poison pills]
- **[Failure 3]**: [e.g., Cache stampede on cold start] → [Mitigation: request coalescing, probabilistic early expiry]

## Monitoring & Observability
- **Key Metrics (SLIs)**: [e.g., message delivery latency p50/p95/p99, error rate, queue depth]
- **SLO Thresholds**: [e.g., 99.9% messages delivered in < 500ms]
- **Alerts**: [What triggers PagerDuty — error rate > 1%, latency > 2x baseline]
- **Distributed Tracing**: [Key flows to instrument with Tempo/Jaeger]

## Security Considerations
- **Auth/AuthZ**: [e.g., JWT with short TTL + refresh token rotation]
- **Encryption**: [In-transit: TLS 1.3 | At-rest: AES-256 for sensitive data]
- **Rate Limiting**: [Per-user, per-IP limits at API Gateway layer]
- **DDoS Protection**: [CloudFront / Cloudflare, WAF rules]

## Tradeoffs
| Approach A | Approach B | Decision | Key Reasoning |
|------------|------------|----------|---------------|
| [Option 1] | [Option 2] | [Chosen] | [Production constraint that drove the choice] |
`.trim();
  }

  // JavaScript / TypeScript (before react/golang)
  if (
    matchSection(s, 'javascript', 'typescript') ||
    s === 'js' ||
    s === 'ts' ||
    s.startsWith('js-') ||
    s.startsWith('ts-')
  ) {
    return `
# [Concept Name — e.g., Event Loop, Closures, Promise.all Polyfill]

## Interview Explanation (Plain English)
[Explain as you would to an interviewer — clear, confident, no filler. The kind of answer that makes them nod immediately.]

## How It Works Internally
[Go deeper than the API surface — V8 engine internals, call stack mechanics, prototype chain resolution, microtask queue ordering, etc. This is the staff-level depth.]

## Real-World Usage
[Where this appears in production codebases — React internals, Node.js event handling, library implementations, etc.]

## Code Example
\`\`\`javascript
// Clean, well-commented implementation
// Focus on demonstrating mastery, not just correctness
\`\`\`

## Common Pitfalls
- [Pitfall 1: what trips up most senior candidates under pressure — e.g., closure in a loop]
- [Pitfall 2: subtle bug that looks correct — e.g., async/await masking unhandled rejections]
- [Pitfall 3: performance anti-pattern — e.g., creating functions inside render]

## Interview Follow-up Questions
- [Follow-up Q1 — what interviewers dig into next — e.g., "How does this interact with the garbage collector?"]
- [Follow-up Q2 — e.g., "How would you implement X without using Y?"]
- [Follow-up Q3 — e.g., "What's the memory implication of this pattern?"]
`.trim();
  }

  // React
  if (matchSection(s, 'react') || s.includes('react')) {
    return `
# [Concept Name — e.g., React Fiber, useEffect Patterns, Server Components]

## Interview Explanation
[Explain as you would to an interviewer — confident and precise. Skip what every junior knows.]

## How It Works Internally
[Fiber reconciler, virtual DOM diffing algorithm, scheduler priority lanes, hydration mechanics — whatever is relevant to this topic. Staff-level depth.]

## When To Use vs. When NOT To Use
- **Use when**: [specific scenario where this is the right choice]
- **Avoid when**: [common over-use or misuse case — e.g., don't use useCallback on every function]
- **The performance trap**: [how misuse hurts — e.g., premature memoization adds overhead]

## Code Example
\`\`\`tsx
// Clean, production-quality React code with comments on non-obvious decisions
\`\`\`

## Common Pitfalls
- [Pitfall 1: e.g., stale closure in useEffect dependency array]
- [Pitfall 2: e.g., over-rendering from context updates hitting every subscriber]
- [Pitfall 3: e.g., useLayoutEffect blocking paint causing jank]

## Interview Follow-up Questions
- [Follow-up Q1 — e.g., "How does React 18 concurrent mode change this?"]
- [Follow-up Q2 — e.g., "How would you optimize this for 10,000 list items?"]
- [Follow-up Q3 — e.g., "How does this work with Server Components?"]
`.trim();
  }

  // Golang / Go (strict match — never use bare includes('go'))
  if (matchSection(s, 'golang', 'go') || s.includes('golang')) {
    return `
# [Concept / Pattern Name — e.g., Goroutines vs OS Threads, Worker Pool, Context Propagation]

## Interview Explanation
[Concise and technical — assume the interviewer knows Go. Skip basics, go straight to the nuance that separates seniors from juniors.]

## How It Works Internally
[Go runtime scheduler (M:N threading model), memory model, channel internals, GC interactions — whatever is relevant to this topic.]

## Implementation
\`\`\`go
// Production-quality Go code
// Comments on non-obvious design choices, not narration
\`\`\`

## Real-World Usage
[Where this pattern appears in production Go services — e.g., how context.WithCancel is used for graceful shutdown in gRPC servers]

## Common Pitfalls
- [Pitfall 1: e.g., goroutine leak from unbuffered channel with no receiver]
- [Pitfall 2: e.g., data race from sharing map without sync.RWMutex]
- [Pitfall 3: e.g., context.Background() used where context.WithTimeout() is needed]

## Tradeoffs
| Approach A | Approach B | When to prefer A |
|------------|------------|------------------|
| [e.g., Mutex] | [e.g., Channel] | [e.g., Protecting shared state vs. communicating ownership] |

## Interview Follow-up Questions
- [Follow-up Q1 — e.g., "How does the Go scheduler handle goroutine preemption?"]
- [Follow-up Q2 — e.g., "How would you implement backpressure in this worker pool?"]
- [Follow-up Q3 — e.g., "What happens to goroutines when the context is cancelled?"]
`.trim();
  }

  // Databases
  if (
    matchSection(s, 'databases', 'database', 'postgres', 'mongodb', 'redis') ||
    s.includes('postgresql') ||
    s.includes('mongo')
  ) {
    return `
# [Database Concept — e.g., B-Tree Indexes, MVCC, Redis Distributed Locks]

## Concept Summary
[What this is and why it's critical for production systems — not a textbook definition, but the production intuition.]

## How It Works Internally
[Internals that matter: B-Tree page splits, MVCC snapshot isolation, Redis single-threaded event loop, MongoDB WiredTiger storage engine — whatever applies.]

## Production Usage
\`\`\`sql
-- or relevant code (PostgreSQL query, Redis command, MongoDB aggregation)
-- with comments on why this specific approach is used
\`\`\`

## Performance Implications
- **Read throughput**: [Impact and tuning knobs]
- **Write throughput**: [Impact and tuning knobs]
- **Storage overhead**: [Space tradeoff]
- **Latency**: [p99 considerations]

## Common Pitfalls
- [Pitfall 1: e.g., creating indexes on low-cardinality columns]
- [Pitfall 2: e.g., SELECT * preventing index-only scans]
- [Pitfall 3: e.g., not using connection pooling — PgBouncer]

## Tradeoffs
| Option A | Option B | When to prefer A |
|----------|----------|------------------|
| [e.g., B-Tree index] | [e.g., GIN index] | [e.g., B-Tree for range queries, GIN for full-text search] |

## Interview Talking Points
- **[Point 1]**: [High-signal insight demonstrating production database experience]
- **[Point 2]**: [Cost/performance tradeoff at scale — e.g., read replica lag in consistency-sensitive queries]
`.trim();
  }

  // Kafka / Messaging
  if (
    matchSection(s, 'kafka', 'rabbitmq', 'messaging') ||
    s.includes('message-queue')
  ) {
    return `
# [Kafka / Messaging Concept — e.g., Consumer Groups, Exactly-Once Semantics, DLQ Pattern]

## Concept Summary
[Production-level intuition — what problem does this solve at scale? Not a definition.]

## How It Works
[Internal mechanics: partition assignment algorithm, offset commit strategies, exchange routing, acknowledgment modes — whatever applies.]

## High-Level Flow
\`\`\`mermaid
graph LR
    Producer --> Broker
    Broker --> ConsumerGroup
    ConsumerGroup --> Consumer1
    ConsumerGroup --> Consumer2
\`\`\`

## Scaling Strategy
[How to scale for high throughput — partition count sizing, consumer group scaling, prefetch settings, batch size tuning]

## Fault Tolerance
[What happens on broker failure, consumer crash, network partition — and the recovery path]

## Failure Modes
- **[Failure 1]**: [e.g., Consumer lag spike] → [Root cause] → [Mitigation: consumer auto-scaling, lag-based alerting]
- **[Failure 2]**: [e.g., Poison pill message] → [Root cause] → [Mitigation: DLQ with retry budget]
- **[Failure 3]**: [e.g., Rebalance storm] → [Root cause] → [Mitigation: sticky partition assignment, incremental rebalancing]

## Tradeoffs
| Kafka | RabbitMQ | Decision Criteria |
|-------|----------|------------------|
| [Kafka strength] | [RabbitMQ strength] | [When to choose each] |

## Interview Talking Points
- **[Point 1]**: [High-signal operational insight — e.g., partition count is permanent, so size for 3x expected peak]
- **[Point 2]**: [Failure mode that separates seniors from juniors — e.g., idempotent consumers are mandatory for at-least-once delivery]
`.trim();
  }

  // Cloud / AWS / DevOps / Kubernetes
  if (
    matchSection(s, 'cloud', 'aws', 'devops', 'kubernetes', 'docker') ||
    s.includes('k8s')
  ) {
    return `
# [Cloud / Infrastructure Topic — e.g., EKS Pod Scheduling, S3 Consistency Model, Kubernetes HPA]

## Concept Summary
[What this service/tool does and its critical role in production systems — skip the marketing, go to operational reality.]

## Architecture / How It Fits
\`\`\`mermaid
graph TD
    [Show how this component fits into the broader production system]
\`\`\`

## Key Configuration & Production Settings
[Critical flags, parameters, or configuration that matter in production — not defaults, but what you'd actually set]

## Production Patterns
[How senior engineers actually use this — not just the happy path, but the operational patterns: blue-green deployments, canary releases, zero-downtime rolling updates, etc.]

## Failure Scenarios
- **[Failure 1]**: [e.g., Node goes NotReady] → [Impact] → [Mitigation: PodDisruptionBudget, pod anti-affinity]
- **[Failure 2]**: [e.g., HPA thrashing] → [Impact] → [Mitigation: stabilization window, scale-down cooldown]
- **[Failure 3]**: [e.g., S3 eventual consistency window during updates] → [Mitigation: conditional writes with ETags]

## Monitoring & Observability
- **Key Metrics**: [What you'd alert on — e.g., pod restart count, node CPU pressure, queue depth]
- **Dashboard essentials**: [Key Grafana panels for this service]
- **Runbook trigger**: [What observation means it's time to page someone]

## Tradeoffs
| Approach A | Approach B | Decision Criteria |
|------------|------------|------------------|
| [e.g., ECS] | [e.g., EKS] | [Operational complexity vs. flexibility] |

## Interview Talking Points
- **[Point 1]**: [Operational experience signal — something that only someone who ran this in production would know]
- **[Point 2]**: [Cost/scaling tradeoff — e.g., Fargate vs EC2 node groups for bursty workloads]
`.trim();
  }

  // AI / LLM / Agentic (strict — never bare includes('ai') or includes('ml'))
  if (
    matchSection(s, 'ai', 'llm', 'agentic') ||
    s.includes('llm') ||
    s.includes('agentic') ||
    s.includes('rag')
  ) {
    return `
# [AI / LLM Topic — e.g., RAG Architecture, Embedding Drift, Agentic Tool Calling]

## Concept Summary
[Staff-level intuition. What problem does this solve in production AI systems? Skip the academic definition — go to the production reality.]

## Real-World Usage
[Where/how this is used in production AI pipelines at scale — concrete systems, not theoretical examples]

## Architecture
\`\`\`mermaid
graph TD
    [Relevant flow: Query → Retrieval → Augmentation → Generation, or Agent loop, etc.]
\`\`\`

## Production Challenges (Scars)
- **[Challenge 1]**: [Root cause in production] → [Advanced mitigation — e.g., "cross-encoder re-ranking to mitigate retrieval relevance drift"]
- **[Challenge 2]**: [Root cause] → [Mitigation — e.g., "semantic chunking over fixed-size to preserve context boundaries"]
- **[Challenge 3]**: [Root cause] → [Mitigation]

## Tradeoffs
| Approach A | Approach B | Key Tradeoff |
|------------|------------|--------------|
| [e.g., RAG] | [e.g., Fine-tuning] | [Latency/cost vs. deep domain adaptation] |
| [e.g., Dense retrieval] | [e.g., BM25] | [Semantic understanding vs. keyword precision] |

## Interview Talking Points
- **[Point 1]**: [High-signal production insight — something that demonstrates you've built this, not just read about it]
- **[Point 2]**: [Cost/latency/reliability angle — e.g., KV caching reduces inference cost by ~40% for repeated context prefixes]

## Scenario-Based Questions
- **[Scenario Q1]**: [e.g., "How would you reduce hallucinations in your RAG system?"]
  - **Answer Hint**: [Brief directional answer hitting the key levers]
- **[Scenario Q2]**: [e.g., "How would you scale LLM inference to handle 10x traffic?"]
  - **Answer Hint**: [Key components: request batching, model quantization, horizontal scaling with load balancing]
`.trim();
  }

  // Universal fallback for any other domain
  return `
# [Topic Name]

## Concept Summary
[Concise staff-level intuition. What is the fundamental problem this solves in production? Skip basics.]

## Why Seniors Are Asked This
[What underlying skill this evaluates: Scalability, Reliability, Cost-Efficiency, OO Design, or Deep Domain Knowledge]

## Recall Triggers (30-Second Recognition)
- [Trigger 1: e.g., "If you see X constraint, think Y approach"]
- [Trigger 2: e.g., "If the failure mode is Z, the pattern is W"]

## The "Staff Difference"
[The deep architectural nuance a junior wouldn't see: thundering herds, idempotency gaps, cascading failure paths, observability blind spots]

## Production Scars (Real Failure Modes)
- **[Failure Mode 1]**: [Root cause] → [Advanced mitigation]
- **[Failure Mode 2]**: [Root cause] → [Advanced mitigation]

## Tradeoff Matrix
| Approach A | Approach B | The Tradeoff |
|------------|------------|--------------|
| [Option 1] | [Option 2] | [Production constraint that drives the decision] |

## Gold Standard Implementation / Architecture
\`\`\`
// Code or Mermaid diagram — whichever is more relevant to this domain
\`\`\`

## Interview Talking Points
- **[Point 1]**: [High-signal insight that demonstrates production experience beyond tutorials]
- **[Point 2]**: [Cost optimization or observability-at-scale angle]

## Follow-up / Scenario Questions
- **[Scenario Q]**: [How would you scale this for 100x traffic?]
  - **Hint**: [Caching, batching, load balancing — the key levers]
`.trim();
}
