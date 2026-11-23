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

The runner writes the machine-readable result to the given `--json` path
(default `packages/microservices/benchmarks/results/baseline.json`).

## Regression gate

```bash
# compare a run against the committed baseline
npm run bench -- --routes 100,1000,10000 --samples 1000 --json /tmp/ms-bench.json
node scripts/check-ms-bench.mjs --current /tmp/ms-bench.json

# refresh the baseline after an intentional change
node scripts/check-ms-bench.mjs --current /tmp/ms-bench.json --update
```

The gate leads with p50 (robust on noisy hosts) and `p50@maxRoutes / p50@minRoutes`
scaling, then treats throughput as a secondary signal that only fails when p50
moved as well. `min-p50-delta` (default 10 µs) absorbs timer jitter on
sub-microsecond scenarios. End-to-end `gateway-forward` uses a wider 2.5x p50
budget because loopback networking is noisier than in-process loops. Budgets can be tuned with
`MS_BENCH_MAX_P50_REGRESSION`, `MS_BENCH_MAX_OPS_REGRESSION`,
`MS_BENCH_MAX_SCALING` or the matching CLI flags. The unified gate runs it as
the `ms-bench` stage.

## Scenarios

| Scenario | What it measures |
|---|---|
| `route-match` | `GatewayInterceptor.previewMatch()` over compiled route tables of 100 / 1,000 / 10,000 routes. This is the per-request gateway routing cost before any forwarding happens. |
| `metrics-write` | One request's metric shape (counter + `_ms` / `_seconds` duration pair) written to `MetricsRegistry`; labels are shared so the result isolates registry work. |
| `metrics-scrape` | `getMetrics()` + Prometheus text rendering for ~1,000 series. |
| `consumer-runtime` | `ConsumerRuntime` with concurrency 32, idempotency enabled and 10% failing deliveries (1,000 messages). |
| `gateway-compress` | `GatewayResponse.send()` for gzip-compressed JSON at 1 KB / 64 KB / 1 MB, with and without ETag (includes serialization, uses the async zlib path). |
| `gateway-forward` | End-to-end forwarding to a loopback HTTP server (16 workers); compares the default fetch dispatcher with `httpPool`. |
| `transport-route-match` | `OptimizedRouter.getRoute()` for Kafka / NATS / Redis / MQTT patterns over 100 / 1,000 / 10,000 routes (trie + protocol wildcard tables, no broker I/O). |

Each scenario reports ops/sec, p50, p99 and peak RSS. The committed baseline is
the median of three runs on the reference machine; the gate compares relative
changes, never absolute numbers across machine classes.

## Adding a scenario

1. Add a function to `run.ts` that returns `BenchmarkResult`.
2. Register it in `scenarios`.
3. Keep it deterministic and free of network/container dependencies.
