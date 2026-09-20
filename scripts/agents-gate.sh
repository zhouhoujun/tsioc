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
#            tsc-agent tsc-agent-ui tsc-agent-gateway tsc-agent-tools
#            build-agent-ui-web dom-gate tui-gate gate-regression
#            pty-acceptance diff-check production-db-integrity
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
    if (cd "$dir" && npm run test >"$log" 2>&1); then
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
    if (cd "$ROOT_DIR/packages/agents/agent-ui" && npx ts-node -r tsconfig-paths/register harness/run-gate-regression.ts "${runner_args[@]}" >"$log" 2>&1); then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        cat "$log" >&2
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
        diff-check)       run_diff_check ;;
        *)
            echo "[GATE-UNKNOWN] $1" >&2
            exit 2
            ;;
    esac
}

ALL_STAGES="agent agent-channels agent-cli agent-gateway agent-providers
            agent-ssh agent-tools agent-ui agent-desktop agent-vscode
            components components-common components-console components-html
            tsc-agent tsc-agent-ui tsc-agent-gateway tsc-agent-tools
            build-agent-ui-web dom-gate tui-gate gate-regression
            pty-acceptance diff-check"

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
