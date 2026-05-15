# Rate Limiter Design

## Concept Summary

Rate limiter designs in Go are crucial for controlling the rate of requests to a service, ensuring stability under load, and protecting backend resources from being overwhelmed. They solve the problem of maintaining service quality and availability by throttling excessive user requests, often crucial in microservices and third-party API integration.

## Why Seniors Are Asked This

This topic explores the balance between system resource utilization, latency, and client experience. It assesses the engineer's ability to design high-throughput systems with mechanisms to prevent abuse or overload, which can impact the reliability and sustainability of services.

## Recall Triggers (30-Second Recognition)

- If your system experiences sudden spikes of traffic that degrade performance, think about implementing a rate limiter.
- If you need to ensure fair resource distribution among users or clients, think token bucket or leaky bucket algorithms.

## The "Staff Difference" (Nuance & Depth)

A staff engineer will weigh options like token bucket vs. leaky bucket based on the system's specific profile of latency sensitivity, request fairness, and traffic burstiness. They would anticipate and design for mitigating thundering herd scenarios or service degradation during temporary rate limit breaches.

## Production Scars (Real-World Failure Modes)

- **Thundering Herd:** When many clients retry simultaneously → Use exponential backoff in retry strategies and rate limit downstream retries.
- **Latency Degradation:** Rate limiter introduces additional latency in high-throughput paths → Collaborate with API consumers on acceptable latency bounds and use local caching strategies for TTL.

## Tradeoff Matrix (Mandatory)

| Token Bucket    | Leaky Bucket      | Trade-off (Latency vs. Accuracy vs. Cost)                                                                                                                                       |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allows bursting | Smoothens traffic | Token Bucket allows short bursts, optimal for sudden spikes, while Leaky Bucket spreads requests more evenly, minimizing sudden burst impact but potentially delaying requests. |

## Gold Standard Implementation / Architecture

```go
// A simple token bucket rate limiter in Go
package ratelimiter

import (
	"sync"
	"time"
)

type RateLimiter struct {
	rate       int           // Tokens added per interval
	bucketSize int           // Maximum tokens the bucket can hold
	tokens     int           // Current available tokens
	mutex      sync.Mutex    // Mutex to support concurrency
	interval   time.Duration // Time interval for rate addition
}

func NewRateLimiter(rate int, bucketSize int, interval time.Duration) *RateLimiter {
	rl := &RateLimiter{
		rate:       rate,
		bucketSize: bucketSize,
		tokens:     bucketSize,
		interval:   interval,
	}

	go rl.refill()
	return rl
}

func (rl *RateLimiter) refill() {
	ticker := time.NewTicker(rl.interval)
	for {
		select {
		case <-ticker.C:
			rl.mutex.Lock()
			if rl.tokens < rl.bucketSize {
				rl.tokens += rl.rate
				if rl.tokens > rl.bucketSize {
					rl.tokens = rl.bucketSize
				}
			}
			rl.mutex.Unlock()
		}
	}
}

func (rl *RateLimiter) AllowRequest() bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	if rl.tokens > 0 {
		rl.tokens--
		return true
	}
	return false
}
```

## Interview Talking Points (High Signal)

- **Policy Definition:** Discuss how the rate limiter policy (e.g., fixed window vs. sliding window) affects client experience and backend load.
- **Distributed Systems:** How to implement a rate limiter across distributed systems without central bottlenecks, focusing on state sharing and eventual consistency.

## Follow-up / Scenario Questions

- **Scenario Q:** How would you scale this for 100x traffic?
- **Answer Hint:** Consider sharding rate limiter state across multiple instances, using consistent hashing for request distribution, and leveraging client-side rate limiting to reduce server load.
