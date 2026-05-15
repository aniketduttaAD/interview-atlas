# Implementing a Circuit Breaker in Go

## Interview Explanation

A circuit breaker is a vital fault-tolerance pattern in distributed systems, designed to prevent cascading failures by opening connections when a system experiences high failure rates. In a Go environment, implementing a circuit breaker requires understanding Goroutines, channels, and concurrency patterns for non-blocking operations. The key is balancing fault tolerance with system performance, ensuring that services can degrade gracefully rather than fail entirely.

## How It Works Internally

The internal mechanism of a circuit breaker involves tracking the success and failure of requests. With this data, the circuit breaker toggles its state between Closed (requests pass), Open (requests are short-circuited), and Half-Open (a limited number of requests are allowed to probe service recovery). This requires concurrency-safe state management using atomic operations or channels in Go, enabling real-time circuit status assessment under concurrent loads.

## Implementation

```go
package circuitbreaker

import (
    "sync"
    "sync/atomic"
    "time"
)

type State int

const (
    Closed State = iota
    Open
    HalfOpen
)

type CircuitBreaker struct {
    state          State
    failureCount   int64
    successThreshold int64
    failureThreshold int64
    resetTimeout   time.Duration
    stateChangeMux sync.Mutex
    lastAttempt    time.Time
}

func NewCircuitBreaker(failureThreshold, successThreshold int64, resetTimeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        state:           Closed,
        failureThreshold: failureThreshold,
        successThreshold: successThreshold,
        resetTimeout:    resetTimeout,
        lastAttempt:     time.Now(),
    }
}

func (cb *CircuitBreaker) allowRequest() bool {
    cb.stateChangeMux.Lock()
    defer cb.stateChangeMux.Unlock()

    switch cb.state {
    case Closed:
        return true
    case Open:
        if time.Since(cb.lastAttempt) > cb.resetTimeout {
            cb.state = HalfOpen
            return true
        }
        return false
    case HalfOpen:
        return true
    }
    return false
}

func (cb *CircuitBreaker) Execute(request func() error) error {
    if !cb.allowRequest() {
        return errors.New("request blocked by circuit breaker")
    }

    cb.lastAttempt = time.Now()
    err := request()
    if err != nil {
        atomic.AddInt64(&cb.failureCount, 1)
        cb.evaluateState(false)
        return err
    }

    cb.evaluateState(true)
    return nil
}

func (cb *CircuitBreaker) evaluateState(success bool) {
    cb.stateChangeMux.Lock()
    defer cb.stateChangeMux.Unlock()

    if success {
        cb.failureCount = 0
        if cb.state == HalfOpen {
            cb.state = Closed
        }
        return
    }

    if atomic.LoadInt64(&cb.failureCount) >= cb.failureThreshold {
        cb.state = Open
    }
}
```

## Real-World Usage

Circuit breakers are commonly used in microservices architecture to isolate and fail fast on services that are down, rather than waiting for time-consuming retries. For example, a Go microservice calling an unstable third-party API could use a circuit breaker to manage load and prevent resource exhaustion.

## Common Pitfalls

- Failing to reset the circuit breaker state properly after recovery can lead to unintended permanent service isolation.
- Misconfigured thresholds can cause premature or delayed state change, impacting system reliability and performance.
- Not using atomic operations or appropriate concurrency controls (like `sync.Mutex`) can result in data races under high concurrency.

## Tradeoffs

| Approach A: Atomic Counters         | Approach B: Channels for State Change          | When to prefer A                          |
| ----------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Fast, non-blocking, minimal locking | Clear separation of concerns, easier to extend | High throughput, low latency requirements |

## Interview Follow-up Questions

- How would you incorporate logging and metrics to monitor the circuit breaker's effectiveness?
- Can you design a system where different services have different thresholds for the circuit breaker?
- Explain how the circuit breaker pattern compares to a rate limiter pattern in handling service failures.
