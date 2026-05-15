# Using Condition Variables for Coordination

## Interview Explanation

Condition variables in Go provide a powerful synchronization mechanism that is essential when you need goroutines to coordinate their execution based on shared state changes. Consider them when a simple mutex isn't sufficient to avoid busy-waiting and you need to efficiently wait for events. For instance, if one goroutine needs to wait for a condition to become true before proceeding, it uses a condition variable to block until it's signaled by another goroutine. This is crucial in scenarios like resource pools or task schedulers where precise coordination is needed.

## How It Works Internally

Internally, Go's `sync.Cond` builds upon mutexes to let goroutines sleep and be woken once some condition is met. Underneath, it wraps `sync.Mutex` or `sync.RWMutex` and provides `Wait`, `Signal`, and `Broadcast` methods. When `Wait` is called, it unlocks the mutex and blocks the goroutine until another goroutine calls `Signal` or `Broadcast`, which wake up one or all waiting goroutines, respectively. Once awakened, the goroutine reacquires the mutex before returning from `Wait`.

## Implementation

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

type SafeQueue struct {
    queue  []int
    cond   *sync.Cond
}

func NewSafeQueue() *SafeQueue {
    return &SafeQueue{
        queue: make([]int, 0),
        cond:  sync.NewCond(&sync.Mutex{}),
    }
}

func (sq *SafeQueue) Enqueue(val int) {
    sq.cond.L.Lock()
    defer sq.cond.L.Unlock()

    sum := 0
    for _, num := range sq.queue {
        sum += num
    }

    if sum+val > 100 {
        sq.cond.Wait() // Wait until enqueuing won't surpass threshold
    }

    sq.queue = append(sq.queue, val)
    sq.cond.Signal() // Notify a waiting goroutine
}

func (sq *SafeQueue) Dequeue() int {
    sq.cond.L.Lock()
    defer sq.cond.L.Unlock()

    for len(sq.queue) == 0 {
        sq.cond.Wait() // Wait until there's an item to dequeue
    }

    val := sq.queue[0]
    sq.queue = sq.queue[1:]
    sq.cond.Signal() // Notify a waiting goroutine
    return val
}

func main() {
    sq := NewSafeQueue()

    var wg sync.WaitGroup
    wg.Add(2)

    // Producer
    go func() {
        defer wg.Done()
        for i := 0; i < 10; i++ {
            sq.Enqueue(i)
            fmt.Printf("Enqueued: %d\n", i)
            time.Sleep(100 * time.Millisecond)
        }
    }()

    // Consumer
    go func() {
        defer wg.Done()
        for i := 0; i < 10; i++ {
            val := sq.Dequeue()
            fmt.Printf("Dequeued: %d\n", val)
            time.Sleep(150 * time.Millisecond)
        }
    }()

    wg.Wait()
}
```

## Real-World Usage

Condition variables are frequently used in bounded resource pools where the resource allocation must be carefully controlled. In database connection pools, condition variables help manage maximum connection constraints by making goroutines wait until a connection is available or a timeout occurs. They are also pivotal in scheduling frameworks handling sleep and wake-up mechanisms sophisticatedly.

## Common Pitfalls

- **Ignoring Spurious Wakeups**: Always check the condition after `Wait` returns due to potential spurious wakeups.
- **Holding Lock for Long Periods**: Avoid holding the lock for unnecessarily long periods within critical sections after a `Wait`.
- **Deadlocks**: Improper signaling or not using `Broadcast` when multiple waiters require simultaneous resumption, leading to deadlocks.

## Tradeoffs

| Mutex              | Condition Variable     | When to prefer Condition Variables                 |
| ------------------ | ---------------------- | -------------------------------------------------- |
| Blocking if locked | Coordination mechanism | When coordination on state change is needed        |
| Simplicity         | Complexity             | Complex waiting conditions beyond mutual exclusion |

## Interview Follow-up Questions

- How can condition variables be used to implement a custom semaphore with limitations?
- How do channels and condition variables compare in terms of performance and use cases in Go?
- Explain how you would design a reusable Go library to handle complex synchronization scenarios using condition variables.
