# Graceful Shutdown in Go

## Concept Summary

Graceful shutdown in Go refers to the process of ensuring that a program exits cleanly, allowing in-flight processes to complete, releasing resources properly, and avoiding data loss. It solves the problem of abrupt terminations which can lead to corruption, inconsistent states, or resource leaks in production.

## Why Seniors Are Asked This

Evaluates: Handling volatility in distributed systems, ensuring reliability, and minimizing downtime during deployments or unexpected shutdowns. This demonstrates an understanding of how critical production systems maintain consistency and availability under duress.

## Recall Triggers (30-Second Recognition)

- "If a service needs to handle SIGTERM/SIGINT signals to close connections gracefully."
- "When a system must perform cleanup tasks before termination, like flushing logs or completing HTTP requests."

## The "Staff Difference" (Nuance & Depth)

Staff-level engineers recognize the nuances of ensuring idempotency and consistency across distributed services during shutdown. They are aware of the impact of thundering herds when services come back online, and how to coordinate state across multiple services to prevent cascading failures.

## Production Scars (Real-World Failure Modes)

- **Abrupt Termination**: Terminating processes too quickly can cause in-progress transactions or requests to be lost. → Implement context cancellation and wait for outstanding requests to complete with timeouts.
- **Dependency Deadlocks**: Mismanaged inter-service shutdowns can lead to bottlenecks. → Ensure downstream dependencies can handle slow shutdowns by queuing requests or using circuit breakers.

## Tradeoff Matrix (Mandatory)

| Strategy A: Immediate Termination | Strategy B: Graceful Shutdown | The Tradeoff (Latency vs. Accuracy vs. Cost)                |
| --------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| Fast exit, possible data loss     | Complete tasks, delay exit    | Accuracy and state integrity vs. latency and resource costs |

## Gold Standard Implementation / Architecture

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    // Create a simple HTTP server
    srv := &http.Server{Addr: ":8080"}

    // Channel to listen for interrupt signals
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

    // Run the server in a goroutine
    go func() {
        fmt.Println("Starting server on :8080")
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            fmt.Printf("ListenAndServe(): %v\n", err)
        }
    }()

    // Blocking until we receive a shutdown signal
    <-stop

    // Create a deadline for the server shutdown
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Attempt graceful shutdown
    fmt.Println("Shutting down server...")
    if err := srv.Shutdown(ctx); err != nil {
        fmt.Printf("Error during shutdown: %v\n", err)
    }
    fmt.Println("Server stopped")
}
```

## Interview Talking Points (High Signal)

- **Use of `context.WithTimeout`:** Appreciates the importance of bounding shutdown durations to avoid indefinite waits.
- **Signal Handling:** Demonstrates understanding of system signals and coordinating them with application lifecycle for clean exits.

## Follow-up / Scenario Questions

- **Scenario Q**: How would you scale this for 100x traffic?
- **Answer Hint**: Employ load balancing with health checks, implement retry mechanisms with exponential backoff for downstream services, and use distributed tracing for observation across scaled instances.
