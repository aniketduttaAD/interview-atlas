# Implementing Circuit Breaker Pattern in Go

## Interview Explanation

The Circuit Breaker Pattern is crucial for building resilient distributed systems. In Go, it's used to prevent a chain reaction of failures when a downstream service becomes unresponsive or unreliable. The pattern protects your service by trip-switching circuits on failures, allowing time for recovery before retrying, thus avoiding cascading failures.

## How It Works Internally

The Go implementation involves state management and timeout handling. The circuit breaker maintains a state for each command: CLOSED, OPEN, or HALF-OPEN.

- **CLOSED**: Calls pass freely. On successive failures, the state transitions to OPEN.
- **OPEN**: Calls are blocked for a timeout period. After timeout, transitions to HALF-OPEN.
- **HALF-OPEN**: Allows a limited number of test calls to determine system recovery. Success shifts back to CLOSED, failure reverts to OPEN.

Go's concurrency primitives, like goroutines for non-blocking retry/timeout, and sync for shared-state management, underpin the implementation.

## Implementation

```go
package circuitbreaker

import (
    "sync"
    "time"
)

// CircuitBreaker states
const (
    Closed   = "CLOSED"
    Open     = "OPEN"
    HalfOpen = "HALF-OPEN"
)

// CircuitBreaker struct
type CircuitBreaker struct {
    state           string
    failureCount    int
    successCount    int
    failureThreshold int
    successThreshold int
    openTimeout     time.Duration
    mutex           sync.Mutex
    lastFailureTime time.Time
}

// NewCircuitBreaker initializes a CircuitBreaker
func NewCircuitBreaker(failureThreshold, successThreshold int, openTimeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        state:            Closed,
        failureThreshold: failureThreshold,
        successThreshold: successThreshold,
        openTimeout:      openTimeout,
    }
}

// Call executes a function with circuit breaker protection
func (cb *CircuitBreaker) Call(fn func() error) error {
    cb.mutex.Lock()

    if cb.state == Open {
        if time.Since(cb.lastFailureTime) > cb.openTimeout {
            cb.state = HalfOpen
        } else {
            cb.mutex.Unlock()
            return errCircuitOpen
        }
    }

    cb.mutex.Unlock()

    if err := fn(); err != nil {
        cb.onFailure()
        return err
    }

    cb.onSuccess()
    return nil
}

func (cb *CircuitBreaker) onFailure() {
    cb.mutex.Lock()
    defer cb.mutex.Unlock()

    cb.failureCount++
    if cb.failureCount >= cb.failureThreshold && cb.state != Open {
        cb.state = Open
        cb.lastFailureTime = time.Now()
    }
}

func (cb *CircuitBreaker) onSuccess() {
    cb.mutex.Lock()
    defer cb.mutex.Unlock()

    cb.successCount++
    if cb.state == HalfOpen && cb.successCount >= cb.successThreshold {
        cb.reset()
    }
}

func (cb *CircuitBreaker) reset() {
    cb.state = Closed
    cb.failureCount = 0
    cb.successCount = 0
}

var errCircuitOpen = errors.New("circuit is open")
```

## Real-World Usage

In large microservices architectures, use circuit breakers to stabilize systems by handling partial failures gracefully. For example, in network- or IO-bound applications, circuit breakers serve as a fallback to prevent saturation. When integrating with third-party APIs, they can block further calls when the API is unresponsive, reducing resource wastage.

## Common Pitfalls

- **State Management Complexity**: Incorrect state transitions can lead to suboptimal performance or complete failure.
- **Too Aggressive Thresholds**: Setting failure thresholds too low may cause premature circuit opening.
- **Ignoring Half-Open State**: Not utilizing HALF-OPEN can lead to misjudging the recovery state of the service.

## Tradeoffs

| Simple Retry Logic           | Circuit Breaker           | When to prefer Circuit Breaker                            |
| ---------------------------- | ------------------------- | --------------------------------------------------------- |
| Quick recovery attempts      | Allows fail-fast          | When failures are systemic and not individual             |
| Retries can sustain pressure | Reduces load on resources | When protecting critical services from high failure rates |

## Interview Follow-up Questions

- How would you integrate this pattern with Go's `context` package for cancellation and timeouts?
- In a distributed setup, how do you handle circuit states if shared state is necessary?
- What operational metrics would you monitor to tune the circuit breaker's parameters?
