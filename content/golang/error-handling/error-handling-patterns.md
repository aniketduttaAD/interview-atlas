# Error Handling Patterns

## Concept Summary

Error handling in Go is crucial for building robust, production-quality systems. Unlike some languages with exceptions, Go favors explicit error propagation, which aids in creating reliable and predictable code. Key patterns include error wrapping, sentinel errors, and leveraging custom error types for enhanced context in diagnostics and logging.

## Why Seniors Are Asked This

Evaluates: System design for achieving reliability and clarity in fault-tolerant systems. Involves cost/latency tradeoffs by deciding when to fail fast or when to retry, and how to provide informative error messages for debugging and monitoring in distributed systems.

## Recall Triggers (30-Second Recognition)

- If system reliability or maintainability is being questioned, think about robust error propagation strategies.
- If dealing with a function that has multiple exit points, consider using error wrapping for enhanced context.

## The "Staff Difference" (Nuance & Depth)

Senior engineers must anticipate the ripple effects of errors across system boundaries. They should design error handling to prevent cascading failures and ensure any error state can be gracefully degraded or retried. Mastery involves architecting frameworks that handle errors consistently and efficiently across microservices.

## Production Scars (Real-World Failure Modes)

- **Silent Failures**: Errors not returned or logged lead to "silent" state corruption. → Use structured logging and monitor error rates to detect anomalies.
- **Cascading Failures**: Errors in one service cause a chain reaction. → Implement circuit breakers and retries with exponential backoff to minimize impact.

## Tradeoff Matrix (Mandatory)

| Wrapping Errors                     | Sentinel Errors                         | The Tradeoff (Context vs. Simplicity vs. Maintenance)    |
| ----------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| Offers rich context for diagnostics | Easier to check for specific conditions | Rich context aids debugging but increases code verbosity |
| Requires more boilerplate code      | Simple equality checks                  | Simplifies understanding but may obscure error origins   |

## Gold Standard Implementation / Architecture

```go
package main

import (
    "errors"
    "fmt"
    "io"
)

// ErrNotFound is a sentinel error for missing entities
var ErrNotFound = errors.New("entity not found")

// ExampleError embeds more context
type ExampleError struct {
    Op  string
    Err error
}

func (e *ExampleError) Error() string {
    return fmt.Sprintf("%s: %v", e.Op, e.Err)
}

func (e *ExampleError) Unwrap() error {
    return e.Err
}

func loadData() error {
    err := io.EOF // Example error
    if err == io.EOF {
        // Wrap with custom error to provide context
        return &ExampleError{Op: "loadData", Err: ErrNotFound}
    }
    return nil
}

func main() {
    err := loadData()
    if errors.Is(err, ErrNotFound) {
        fmt.Println("Handle not found case:", err)
    } else if err != nil {
        fmt.Println("General error:", err)
    }
}
```

## Interview Talking Points (High Signal)

- **Contextual Error Patterns**: Discuss how adding context to errors aids in post-mortem analysis and system observability.
- **Error Propagation**: Highlight the tradeoffs between immediate failure vs. retries and how it affects system stability and responsiveness.

## Follow-up / Scenario Questions

- **Scenario Q**: How would you scale this for 100x traffic?
- **Answer Hint**: Use centralized error handling logs, integrate with a monitoring system for error rate alerting, and design the system for graceful degradation to absorb spikes in load.
