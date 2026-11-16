# Microservice benchmarks

Reproducible, in-process benchmarks for the hot paths called out in
[`../IMPROVEMENT-PLAN.md`](../IMPROVEMENT-PLAN.md). Results are committed as
JSON so later changes can be compared against a real number instead of an
assumption (repository rule: performance work needs measurement).

## Run

```bash
# from the repository root
npm run bench

# smaller run
npm run bench -- --routes 100,1000 --samples 500
```

The runner writes the machine-readable result to
`packages/microservices/benchmarks/results/baseline.json`.

## Scenarios

| Scenario | What it measures |
|---|---|
| `route-match` | `GatewayInterceptor.previewMatch()` over compiled route tables of 100 / 1,000 / 10,000 routes. This is the per-request gateway routing cost before any forwarding happens. |

Each scenario reports ops/sec, p50, p99 and peak RSS. CI should only compare a
run against the committed baseline on the same machine class (relative
regression check), never treat the absolute numbers as a gate.

## Adding a scenario

1. Add a function to `run.ts` that returns `BenchmarkResult`.
2. Register it in `scenarios`.
3. Keep it deterministic and free of network/container dependencies.
