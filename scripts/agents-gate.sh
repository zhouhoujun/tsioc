#!/usr/bin/env bash
#
# v20-B — Unified CI gate entry for @tsdi agents + framework layer.
#
# Chains every reproducible acceptance carrier into one gate:
#   1. unit tests: 10 agent subpackages (each must EXIT=0)
#   2. unit tests: components / components/common / components/console / components/html
#   3. tsc --noEmit: agent / agent-ui / agent-gateway / agent-tools
#   4. production build: agent-ui browser bundle + markdown worker
#   5. DOM gate: harness/run-dom-gate.ts (JSDOM virtual DOM, 5 scenarios +
#      timeline acceptance at 80/100 terminal-equivalent columns)
#   6. TUI gate: harness/run-tui-gate.ts (ConsoleRenderer text stream, 5 scenarios)
#   7. gate regression: gate metrics vs harness/gate-baseline.json ([REGRESSION]/[OK])
#   8. PTY acceptance: acceptance/run_acceptance.py (real terminal; skip+report
#      when python3/pty/agent-cli artifact unavailable — never fake a pass)
#   9. git diff --check (workspace cleanliness)
#
# Each stage prints `[GATE-PASS]/[GATE-FAIL]/[GATE-SKIP] <id>: <label>` so CI
# output is greppable. The script exits non-zero when ANY executed stage FAILed.
#
# Usage:
#   bash scripts/agents-gate.sh                  # all stages
#   bash scripts/agents-gate.sh agent agent-ui   # named stages only
#   RUN_PTY=1 bash scripts/agents-gate.sh        # include PTY acceptance
#
# Stage ids: agent agent-channels agent-cli agent-gateway agent-providers
#            agent-ssh agent-tools agent-ui agent-desktop agent-vscode
#            components components-common components-console components-html
#            components-bench components-common-bench
#            tsc-agent tsc-agent-ui tsc-agent-gateway tsc-agent-tools
#            build-agent-ui-web dom-gate tui-gate gate-regression
#            pty-acceptance diff-check production-db-integrity
#            ms-core ms-observe ms-discovery ms-protocols ms-gateway ms-admin ms-http
#            ms-brokers ms-tsc ms-bench ms-broker-bench ms-examples ms-examples-broker ms-chaos ms-soak ms-soak
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

hash_file() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$1"
    else
        shasum -a 256 "$1"
    fi
}

ORIGINAL_HOME="${HOME:-}"
PRODUCTION_DB="${ORIGINAL_HOME:+$ORIGINAL_HOME/.tsdi-agent/agent.db}"
PRODUCTION_DB_BEFORE="missing"
if [ -n "$PRODUCTION_DB" ] && [ -f "$PRODUCTION_DB" ]; then
    PRODUCTION_DB_BEFORE="$(hash_file "$PRODUCTION_DB")"
fi
GATE_TEST_HOME="$(mktemp -d /tmp/tsdi-agent-gate-home.XXXXXX)"
trap 'rm -rf "$GATE_TEST_HOME"' EXIT
export HOME="$GATE_TEST_HOME"

LOG_DIR="${GATE_LOG_DIR:-/tmp/agents-gate-logs}"
mkdir -p "$LOG_DIR"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
FAILED_STAGES=""
DOM_METRICS_READY=0
TUI_METRICS_READY=0

stage_pass() { PASS_COUNT=$((PASS_COUNT + 1)); echo "[GATE-PASS] $1: $2"; }
stage_fail() { FAIL_COUNT=$((FAIL_COUNT + 1)); FAILED_STAGES="$FAILED_STAGES $1"; echo "[GATE-FAIL] $1: $2"; }
stage_skip() { SKIP_COUNT=$((SKIP_COUNT + 1)); echo "[GATE-SKIP] $1: $2"; }

# run_npm_test <id> <label> <pkg-dir>
run_npm_test() {
    local id="$1" label="$2" dir="$3"
    local log="$LOG_DIR/$id.log"
    local started
    started=$(date +%s)
    local rss_file="$log.rss"
    local status=0
    if [ -x /usr/bin/time ]; then
        (cd "$dir" && /usr/bin/time -f '%M' -o "$rss_file" npm run test >"$log" 2>&1) || status=$?
    else
        (cd "$dir" && npm run test >"$log" 2>&1) || status=$?
    fi
    if [ "$status" -eq 0 ]; then
        local elapsed=$(( $(date +%s) - started ))
        local budget
        budget=$(node -e "try{const b=require('./scripts/test-budget-baseline.json');process.stdout.write(String(b['$id']||0))}catch{process.stdout.write('0')}" 2>/dev/null || echo 0)
        local rss_kb=0
        [ -f "$rss_file" ] && rss_kb=$(tail -1 "$rss_file" | tr -dc '0-9')
        local rss_mb=$(( ${rss_kb:-0} / 1024 ))
        local rss_budget
        rss_budget=$(node -e "try{const b=require('./scripts/test-rss-budget-mb.json');process.stdout.write(String(b['$id']||0))}catch{process.stdout.write('0')}" 2>/dev/null || echo 0)
        echo "wall clock: ${elapsed}s (budget ${budget}s); max rss: ${rss_mb} MiB (budget ${rss_budget})" >>"$log"
        if [ "$budget" -gt 0 ] && [ "$elapsed" -gt "$budget" ]; then
            stage_fail "$id" "$label (${elapsed}s > ${budget}s wall-clock budget)"
            echo "--- $id exceeded the wall-clock test budget ---" >&2
            tail -10 "$log" >&2
            return
        fi
        if [ "$rss_budget" -gt 0 ] && [ "$rss_mb" -gt "$rss_budget" ]; then
            stage_fail "$id" "$label (${rss_mb} MiB > ${rss_budget} MiB RSS budget)"
            echo "--- $id exceeded the RSS test budget ---" >&2
            tail -10 "$log" >&2
            return
        fi
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        echo "--- $id tail (last 30 lines) ---" >&2
        tail -30 "$log" >&2
    fi
}

# run_tsc <id> <label> <pkg-dir>
run_tsc() {
    local id="$1" label="$2" dir="$3"
    local log="$LOG_DIR/$id.log"
    if (cd "$dir" && npx tsc --noEmit >"$log" 2>&1); then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        echo "--- $id tail (last 30 lines) ---" >&2
        tail -30 "$log" >&2
    fi
}

# run_npm_script <id> <label> <pkg-dir> <script>
run_npm_script() {
    local id="$1" label="$2" dir="$3" script="$4"
    local log="$LOG_DIR/$id.log"
    if (cd "$dir" && npm run "$script" >"$log" 2>&1); then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        echo "--- $id tail (last 30 lines) ---" >&2
        tail -30 "$log" >&2
    fi
}

# run_components_bench — opt-in performance budget (machine dependent)
run_components_bench() {
    if [ "${RUN_COMPONENTS_BENCH:-}" != "1" ]; then
        stage_skip components-bench 'components performance budgets (opt-in; set RUN_COMPONENTS_BENCH=1)'
        return
    fi
    run_npm_script components-bench 'components performance budgets' packages/components bench:check
}

# run_common_bench — calibration-scaled common widget budget (opt-out with SKIP_COMMON_BENCH=1)
run_common_bench() {
    if [ "${SKIP_COMMON_BENCH:-}" = "1" ]; then
        stage_skip components-common-bench 'common widget budgets (skipped; unset SKIP_COMMON_BENCH to run)'
        return
    fi
    run_npm_script components-common-bench 'common widget budgets' packages/components/common bench:check
}

# run_harness <id> <label> <gate-ts> [extra args...]
run_harness() {
    local id="$1" label="$2" gate="$3"
    shift 3
    local log="$LOG_DIR/$id.log"
    if (cd packages/agents/agent-ui && npx ts-node -r tsconfig-paths/register "harness/$gate" "$@" >"$log" 2>&1); then
        if [ "$id" = "dom-gate" ]; then
            DOM_METRICS_READY=1
        elif [ "$id" = "tui-gate" ]; then
            TUI_METRICS_READY=1
        fi
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        echo "--- $id tail (last 40 lines) ---" >&2
        tail -40 "$log" >&2
    fi
}

# run_pty <id> <label>
#
# PTY acceptance is opt-in (RUN_PTY=1) because it requires a Unix PTY and a
# prebuilt agent-cli artifact. CI environments that provide both should enable it.
run_pty() {
    local id="$1" label="$2"
    if [ "${RUN_PTY:-0}" != "1" ]; then
        stage_skip "$id" "$label (opt-in; set RUN_PTY=1 when Unix PTY and agent-cli artifact are available)"
        return
    fi
    if ! command -v python3 >/dev/null 2>&1; then
        stage_skip "$id" "$label (python3 unavailable)"
        return
    fi
    if ! python3 -c 'import pty' >/dev/null 2>&1; then
        stage_skip "$id" "$label (pty unavailable)"
        return
    fi
    if [ ! -f packages/agents/agent-cli/bin/tsdi-agent.js ]; then
        stage_skip "$id" "$label (agent-cli artifact missing: run agent-cli build first)"
        return
    fi
    local log="$LOG_DIR/$id.log"
    if (PYTHONUNBUFFERED=1 python3 packages/agents/acceptance/run_acceptance.py >"$log" 2>&1); then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        echo "--- $id tail (last 60 lines) ---" >&2
        tail -60 "$log" >&2
    fi
}

# run_gate_regression — compare gate metrics JSON against committed baseline.
# Only consumes metrics produced successfully in this script invocation. Files
# left in the persistent log directory by an earlier run are never evidence.
run_gate_regression() {
    local id="gate-regression" label="gate metrics regression vs baseline"
    local dom_json="$LOG_DIR/dom-gate-metrics.json"
    local tui_json="$LOG_DIR/tui-gate-metrics.json"
    if [ "$DOM_METRICS_READY" -ne 1 ] && [ "$TUI_METRICS_READY" -ne 1 ]; then
        stage_skip "$id" "$label (no current-run metrics — run dom-gate/tui-gate first)"
        return
    fi
    local baseline="$ROOT_DIR/packages/agents/agent-ui/harness/gate-baseline.json"
    local runner_args=()
    [ "$DOM_METRICS_READY" -eq 1 ] && runner_args+=(--dom "$dom_json")
    [ "$TUI_METRICS_READY" -eq 1 ] && runner_args+=(--tui "$tui_json")
    runner_args+=(--baseline "$baseline")
    local log="$LOG_DIR/$id.log"
    local check=(npx ts-node -r tsconfig-paths/register harness/run-gate-regression.ts "${runner_args[@]}")
    if (cd "$ROOT_DIR/packages/agents/agent-ui" && "${check[@]}" >"$log" 2>&1); then
        stage_pass "$id" "$label"
        return
    fi
    # Wall-clock metrics are sensitive to host load; a spike is not a regression.
    # Re-measure once (same scenarios, same thresholds) before failing the gate.
    echo "[GATE-RETRY] $id: metrics exceeded thresholds; re-measuring after a short cooldown" >&2
    sleep 5
    if [ "$DOM_METRICS_READY" -eq 1 ]; then
        (cd "$ROOT_DIR/packages/agents/agent-ui" && npx ts-node -r tsconfig-paths/register harness/run-dom-gate.ts --json "$dom_json" >>"$log" 2>&1)
    fi
    if [ "$TUI_METRICS_READY" -eq 1 ]; then
        (cd "$ROOT_DIR/packages/agents/agent-ui" && npx ts-node -r tsconfig-paths/register harness/run-tui-gate.ts --json "$tui_json" >>"$log" 2>&1)
    fi
    if (cd "$ROOT_DIR/packages/agents/agent-ui" && "${check[@]}" >>"$log" 2>&1); then
        stage_pass "$id" "$label (passed on re-measure)"
        return
    fi
    stage_fail "$id" "$label"
    cat "$log" >&2
}

# run_source_size
run_source_size() {
    local id="source-size" label="agents source file line budget"
    local log="$LOG_DIR/$id.log"
    if node "$ROOT_DIR/scripts/check-source-size.mjs" >"$log" 2>&1; then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        cat "$log" >&2
    fi
}

# run_package_deps
run_package_deps() {
    local id="package-deps" label="microservice package dependencies"
    local log="$LOG_DIR/$id.log"
    if node "$ROOT_DIR/scripts/check-package-deps.mjs" >"$log" 2>&1; then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        cat "$log" >&2
    fi
}

# run_package_publish
run_package_publish() {
    local id="package-publish" label="microservice package publish payload"
    local log="$LOG_DIR/$id.log"
    if node "$ROOT_DIR/scripts/verify-package-publish.mjs" >"$log" 2>&1; then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        cat "$log" >&2
    fi
}

# run_publish_dry_run
run_publish_dry_run() {
    local id="publish-dry-run" label="microservice publish dry-run"
    local packages="${PUBLISH_DRY_RUN_PACKAGES:-}"
    local log="$LOG_DIR/$id.log"
    if [ -z "$packages" ]; then
        stage_skip "$id" "$label (set PUBLISH_DRY_RUN_PACKAGES=gateway,... to run)"
        return
    fi
    local shard="${PUBLISH_DRY_RUN_SHARD:-}"
    local shardArg=""
    if [ -n "$shard" ]; then shardArg="--shard=$shard"; fi
    if node "$ROOT_DIR/scripts/publish-dry-run.mjs" "--packages=$packages" $shardArg >"$log" 2>&1; then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        tail -60 "$log" >&2
    fi
}

# run_ms_group <id> <label> <pkg-dir>...
#
# Runs each microservice package's unit suite. Every package log is kept in
# $LOG_DIR so a failure can be triaged; one failing package fails the stage.
run_ms_group() {
    local id="$1" label="$2"
    shift 2
    if [ "$#" -eq 0 ]; then
        stage_skip "$id" "$label (no packages)"
        return
    fi
    local failed="" dir name log
    for dir in "$@"; do
        name="${dir##*/}"
        log="$LOG_DIR/$id-$name.log"
        if ! (cd "$ROOT_DIR/$dir" && npm run test >"$log" 2>&1); then
            failed="$failed $name"
            echo "--- $id/$name tail (last 30 lines) ---" >&2
            tail -30 "$log" >&2
        fi
    done
    if [ -z "$failed" ]; then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label (failed:${failed})"
    fi
}

# run_ms_broker_bench — opt-in Redis Stream throughput probe.
run_ms_broker_bench() {
    local id="ms-broker-bench" label="microservice broker throughput probe"
    if [ "${MS_BROKER_BENCH_PROFILE:-0}" != "1" ]; then
        stage_skip "$id" "$label (opt-in; set MS_BROKER_BENCH_PROFILE=1 with Redis running)"
        return
    fi
    local log="$LOG_DIR/ms-broker-bench.log"
    if (cd "$ROOT_DIR" && timeout 300 npx ts-node -r tsconfig-paths/register \
        packages/microservices/benchmarks/broker-throughput.ts >"$log" 2>&1); then
        stage_pass "$id" "$label"
    else
        echo "--- ms-broker-bench tail (last 30 lines) ---" >&2
        tail -30 "$log" >&2
        stage_fail "$id" "$label"
    fi
}

# run_ms_chaos — opt-in multi-process gateway kill/recovery chaos.
run_ms_chaos() {
    local id="ms-chaos" label="microservice multi-process gateway chaos"
    if [ "${MS_CHAOS_PROFILE:-0}" != "1" ]; then
        stage_skip "$id" "$label (opt-in; set MS_CHAOS_PROFILE=1 with Redis running)"
        return
    fi
    local log="$LOG_DIR/ms-chaos.log"
    if (cd "$ROOT_DIR" && timeout 300 node scripts/ms-chaos.mjs >"$log" 2>&1); then
        stage_pass "$id" "$label"
    else
        echo "--- ms-chaos tail (last 30 lines) ---" >&2
        tail -30 "$log" >&2
        stage_fail "$id" "$label"
    fi
}

# run_ms_examples_broker — opt-in gateway→Redis full-stack smoke.
run_ms_examples_broker() {
    local id="ms-examples-broker" label="microservice gateway→broker smoke"
    if [ "${MS_BROKER_PROFILE:-0}" != "1" ]; then
        stage_skip "$id" "$label (opt-in; set MS_BROKER_PROFILE=1 with Redis running)"
        return
    fi
    local log="$LOG_DIR/ms-examples-broker.log"
    if (cd "$ROOT_DIR" && timeout 240 npx ts-node -r tsconfig-paths/register \
        packages/microservices/examples/broker-stack-smoke.ts >"$log" 2>&1); then
        stage_pass "$id" "$label"
    else
        echo "--- ms-examples-broker tail (last 30 lines) ---" >&2
        tail -30 "$log" >&2
        stage_fail "$id" "$label"
    fi
}

# run_ms_soak — opt-in soak smoke (heap/handle stability under HTTP load).
run_ms_soak() {
    local id="ms-soak" label="microservice soak (heap/handle stability)"
    if [ "${MS_SOAK_PROFILE:-0}" != "1" ]; then
        stage_skip "$id" "$label (opt-in; set MS_SOAK_PROFILE=1, optionally MS_SOAK_MS=1800000)"
        return
    fi
    local log="$LOG_DIR/ms-soak.log"
    local duration="${MS_SOAK_MS:-30000}"
    if (cd "$ROOT_DIR" && NODE_OPTIONS=--expose-gc MS_SOAK_MS="$duration" timeout 600 \
        npx ts-node -r tsconfig-paths/register packages/microservices/examples/soak.ts >"$log" 2>&1); then
        stage_pass "$id" "$label"
    else
        echo "--- ms-soak tail (last 30 lines) ---" >&2
        tail -30 "$log" >&2
        stage_fail "$id" "$label"
    fi
}

# run_ms_examples — boots the quickstart example against a real HTTP port.
run_ms_examples() {
    local log="$LOG_DIR/ms-examples.log"
    if (cd "$ROOT_DIR" && timeout 180 npx ts-node -r tsconfig-paths/register \
        packages/microservices/examples/smoke.ts >"$log" 2>&1); then
        if (cd "$ROOT_DIR" && timeout 180 npx ts-node -r tsconfig-paths/register \
            packages/microservices/examples/full-stack-smoke.ts >>"$log" 2>&1 \
            && timeout 60 npx ts-node -r tsconfig-paths/register packages/microservices/examples/outbox.ts >>"$log" 2>&1 \
            && timeout 60 npx ts-node -r tsconfig-paths/register packages/microservices/examples/saga.ts >>"$log" 2>&1); then
            stage_pass ms-examples 'microservice quickstart + full-stack + outbox + saga smoke'
        else
            echo "--- ms-examples tail (last 30 lines) ---" >&2
            tail -30 "$log" >&2
            stage_fail ms-examples 'microservice quickstart + full-stack smoke'
        fi
    else
        echo "--- ms-examples tail (last 30 lines) ---" >&2
        tail -30 "$log" >&2
        stage_fail ms-examples 'microservice quickstart + full-stack smoke'
    fi
}

# run_ms_brokers — broker suites need real middleware (Docker). Opt-in only, and
# reported as an explicit SKIP when the profile is not enabled (never fake pass).
run_ms_brokers() {
    local id="ms-brokers" label="microservice broker suites (amqp/kafka/mqtt/nats/redis)"
    if [ "${MS_BROKER_PROFILE:-0}" != "1" ]; then
        stage_skip "$id" "$label (opt-in; set MS_BROKER_PROFILE=1 with middleware running)"
        return
    fi
    run_ms_group "$id" "$label" \
        packages/microservices/amqp \
        packages/microservices/kafka \
        packages/microservices/mqtt \
        packages/microservices/nats \
        packages/microservices/redis
}

# run_ms_tsc — tsc --noEmit for every package that declares a tsconfig.
run_ms_tsc() {
    local id="ms-tsc" label="microservice tsc --noEmit"
    local failed="" dir name log
    for dir in "$ROOT_DIR"/packages/microservices/*/; do
        dir="${dir%/}"
        name="${dir##*/}"
        [ -f "$dir/tsconfig.json" ] || continue
        log="$LOG_DIR/$id-$name.log"
        if ! (cd "$dir" && npx tsc --noEmit >"$log" 2>&1); then
            failed="$failed $name"
            echo "--- $id/$name tail (last 30 lines) ---" >&2
            tail -30 "$log" >&2
        fi
    done
    if [ -z "$failed" ]; then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label (failed:${failed})"
    fi
}

# run_ms_bench — benchmark regression gate. Runs the in-process harness and
# compares p50 / throughput / route-count scaling against the committed
# baseline. Host noise is absorbed by `min-p50-delta`; tune budgets with
# MS_BENCH_MAX_P50_REGRESSION / MS_BENCH_MAX_OPS_REGRESSION / MS_BENCH_MAX_SCALING.
run_ms_bench() {
    local id="ms-bench" label="microservice benchmark regression"
    local log="$LOG_DIR/$id.log"
    if npm run bench -- --routes 100,1000,10000 --samples 1000 --json "$LOG_DIR/ms-bench.json" >"$log" 2>&1 \
        && node scripts/check-ms-bench.mjs --current "$LOG_DIR/ms-bench.json" >>"$log" 2>&1; then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        tail -40 "$log" >&2
    fi
}

# run_diff_check
run_diff_check() {
    local log="$LOG_DIR/diff-check.log"
    if git diff --check >"$log" 2>&1; then
        stage_pass diff-check "git diff --check"
    else
        stage_fail diff-check "git diff --check"
        cat "$log" >&2
    fi
}

run_production_db_integrity() {
    local after="missing"
    if [ -n "$PRODUCTION_DB" ] && [ -f "$PRODUCTION_DB" ]; then
        after="$(hash_file "$PRODUCTION_DB")"
    fi
    if [ "$after" = "$PRODUCTION_DB_BEFORE" ]; then
        stage_pass production-db-integrity "production database unchanged"
    else
        stage_fail production-db-integrity "production database changed during gate"
    fi
}

# run_stage <stage-id>
run_stage() {
    case "$1" in
        agent)            run_npm_test agent '@tsdi/agent unit tests' packages/agents/agent ;;
        agent-channels)   run_npm_test agent-channels '@tsdi/agent-channels unit tests' packages/agents/agent-channels ;;
        agent-cli)        run_npm_test agent-cli '@tsdi/agent-cli unit tests' packages/agents/agent-cli ;;
        agent-gateway)    run_npm_test agent-gateway '@tsdi/agent-gateway unit tests' packages/agents/agent-gateway ;;
        agent-providers)  run_npm_test agent-providers '@tsdi/agent-providers unit tests' packages/agents/agent-providers ;;
        agent-ssh)        run_npm_test agent-ssh '@tsdi/agent-ssh unit tests' packages/agents/agent-ssh ;;
        agent-tools)      run_npm_test agent-tools '@tsdi/agent-tools unit tests' packages/agents/agent-tools ;;
        agent-ui)         run_npm_test agent-ui '@tsdi/agent-ui unit tests' packages/agents/agent-ui ;;
        agent-desktop)    run_npm_test agent-desktop '@tsdi/agent-desktop unit tests' packages/agents/agent-desktop ;;
        agent-vscode)     run_npm_test agent-vscode '@tsdi/agent-vscode unit tests' packages/agents/agent-vscode ;;
        components)       run_npm_test components '@tsdi/components unit tests' packages/components ;;
        components-common) run_npm_test components-common '@tsdi/components/common unit tests' packages/components/common ;;
        components-console) run_npm_test components-console '@tsdi/components/console unit tests' packages/components/console ;;
        components-html)  run_npm_test components-html '@tsdi/components/html unit tests' packages/components/html ;;
        components-bench) run_components_bench ;;
        components-common-bench) run_common_bench ;;
        tsc-agent)        run_tsc tsc-agent 'tsc --noEmit @tsdi/agent' packages/agents/agent ;;
        tsc-agent-ui)     run_tsc tsc-agent-ui 'tsc --noEmit @tsdi/agent-ui' packages/agents/agent-ui ;;
        tsc-agent-gateway) run_tsc tsc-agent-gateway 'tsc --noEmit @tsdi/agent-gateway' packages/agents/agent-gateway ;;
        tsc-agent-tools)  run_tsc tsc-agent-tools 'tsc --noEmit @tsdi/agent-tools' packages/agents/agent-tools ;;
        build-agent-ui-web) run_npm_script build-agent-ui-web 'agent-ui browser production bundle' packages/agents/agent-ui build:web ;;
        dom-gate)         run_harness dom-gate 'DOM gate (JSDOM, 5 scenarios + 80/100-col timeline matrix)' run-dom-gate.ts --json "$LOG_DIR/dom-gate-metrics.json" ;
                          run_harness dom-gate-matrix 'DOM timeline matrix (80/100 columns)' run-dom-gate.ts timeline-naturalized --viewport 640x800,800x800 ;;
        tui-gate)         run_harness tui-gate 'TUI gate (text stream, 5 scenarios)' run-tui-gate.ts --json "$LOG_DIR/tui-gate-metrics.json" ;;
        gate-regression)  run_gate_regression ;;
        pty-acceptance)   run_pty pty-acceptance 'PTY acceptance (real terminal)' ;;
        source-size)      run_source_size ;;
        package-deps)     run_package_deps ;;
        package-publish)  run_package_publish ;;
        publish-dry-run)  run_publish_dry_run ;;
        ms-core)          run_ms_group ms-core '@tsdi microservice core tests (common/transport/service/client)' \
                              packages/common \
                              packages/microservices/transport \
                              packages/microservices/service \
                              packages/microservices/client ;;
        ms-observe)       run_ms_group ms-observe '@tsdi microservice observability tests (config/health/metrics/tracing)' \
                              packages/microservices/config \
                              packages/microservices/health \
                              packages/microservices/metrics \
                              packages/microservices/tracing ;;
        ms-discovery)     run_ms_group ms-discovery '@tsdi microservice discovery tests' packages/microservices/discovery ;;
        ms-protocols)     run_ms_group ms-protocols '@tsdi microservice protocol tests (contract/mime/swagger/mcp/grpc/tcp/udp/ws/coap)' \
                              packages/microservices/contract \
                              packages/microservices/mime \
                              packages/microservices/swagger \
                              packages/microservices/mcp \
                              packages/microservices/grpc \
                              packages/microservices/tcp \
                              packages/microservices/udp \
                              packages/microservices/ws \
                              packages/microservices/coap ;;
        ms-gateway)       run_ms_group ms-gateway '@tsdi/gateway unit tests' packages/microservices/gateway ;;
        ms-admin)         run_ms_group ms-admin '@tsdi gateway admin console tests' packages/microservices/admin ;;
        ms-http)          run_ms_group ms-http '@tsdi/http-microservice unit tests' packages/microservices/http ;;
        ms-brokers)       run_ms_brokers ;;
        ms-tsc)           run_ms_tsc ;;
        ms-examples)      run_ms_examples ;;
        ms-soak)          run_ms_soak ;;
        ms-examples-broker) run_ms_examples_broker ;;
        ms-chaos)         run_ms_chaos ;;
        ms-broker-bench)  run_ms_broker_bench ;;
        ms-bench)         run_ms_bench ;;
        diff-check)       run_diff_check ;;
        *)
            echo "[GATE-UNKNOWN] $1" >&2
            exit 2
            ;;
    esac
}

ALL_STAGES="agent agent-channels agent-cli agent-gateway agent-providers
            agent-ssh agent-tools agent-ui agent-desktop agent-vscode
            components components-common components-console components-html components-bench components-common-bench
            tsc-agent tsc-agent-ui tsc-agent-gateway tsc-agent-tools
            build-agent-ui-web dom-gate tui-gate gate-regression
            pty-acceptance diff-check source-size
            ms-core ms-observe ms-discovery ms-protocols ms-gateway ms-admin ms-http
            ms-brokers ms-tsc ms-bench ms-examples
            package-deps package-publish publish-dry-run"

if [ "$#" -gt 0 ]; then
    STAGES="$*"
else
    STAGES="$ALL_STAGES"
fi

echo "=== agents gate start ($(date -u +%Y-%m-%dT%H:%M:%SZ)) ==="
for stage in $STAGES; do
    run_stage "$stage"
done
run_production_db_integrity
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
if [ "$FAIL_COUNT" -eq 0 ]; then
    echo "=== agents gate summary: PASS ($PASS_COUNT passed, $SKIP_COUNT skipped, $TOTAL total) ==="
else
    echo "=== agents gate summary: FAIL ($FAIL_COUNT failed:${FAILED_STAGES}, $PASS_COUNT passed, $SKIP_COUNT skipped, $TOTAL total) ==="
fi
exit "$FAIL_COUNT"
