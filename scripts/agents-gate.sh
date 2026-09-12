#!/usr/bin/env bash
#
# v20-A — Unified CI gate entry for @tsdi agents + framework layer.
#
# Chains every reproducible acceptance carrier into one gate:
#   1. unit tests: 10 agent subpackages (each must EXIT=0)
#   2. unit tests: components / components/console / components/html
#   3. tsc --noEmit: agent / agent-ui / agent-gateway / agent-tools
#   4. DOM gate: harness/run-dom-gate.ts (JSDOM virtual DOM, 4 scenarios)
#   5. TUI gate: harness/run-tui-gate.ts (ConsoleRenderer text stream, 4 scenarios)
#   6. PTY acceptance: acceptance/run_acceptance.py (real terminal; skip+report
#      when python3/pty/agent-cli artifact unavailable — never fake a pass)
#   7. git diff --check (workspace cleanliness)
#
# Each stage prints `[GATE-PASS]/[GATE-FAIL]/[GATE-SKIP] <id>: <label>` so CI
# output is greppable. The script exits non-zero when ANY executed stage FAILed.
#
# Usage:
#   bash scripts/agents-gate.sh                  # all stages
#   bash scripts/agents-gate.sh agent agent-ui   # named stages only
#   SKIP_PTY=1 bash scripts/agents-gate.sh       # skip PTY acceptance
#
# Stage ids: agent agent-channels agent-cli agent-gateway agent-providers
#            agent-ssh agent-tools agent-ui agent-desktop agent-vscode
#            components components-console components-html
#            tsc-agent tsc-agent-ui tsc-agent-gateway tsc-agent-tools
#            dom-gate tui-gate pty-acceptance diff-check
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="${GATE_LOG_DIR:-/tmp/agents-gate-logs}"
mkdir -p "$LOG_DIR"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
FAILED_STAGES=""

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

# run_harness <id> <label> <gate-ts>
run_harness() {
    local id="$1" label="$2" gate="$3"
    local log="$LOG_DIR/$id.log"
    if (cd packages/agents/agent-ui && npx ts-node -r tsconfig-paths/register "harness/$gate" >"$log" 2>&1); then
        stage_pass "$id" "$label"
    else
        stage_fail "$id" "$label"
        echo "--- $id tail (last 40 lines) ---" >&2
        tail -40 "$log" >&2
    fi
}

# run_pty <id> <label>
#
# PTY acceptance is opt-in (RUN_PTY=1): metric thresholds are manually backfilled
# (acceptance/CHECKLIST.md) and lifecycle threshold work lands in v20-D, so the
# stage stays out of the default gate until then.
run_pty() {
    local id="$1" label="$2"
    if [ "${RUN_PTY:-0}" != "1" ]; then
        stage_skip "$id" "$label (opt-in; set RUN_PTY=1 — metric thresholds backfilled in v20-D)"
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
        components-console) run_npm_test components-console '@tsdi/components/console unit tests' packages/components/console ;;
        components-html)  run_npm_test components-html '@tsdi/components/html unit tests' packages/components/html ;;
        tsc-agent)        run_tsc tsc-agent 'tsc --noEmit @tsdi/agent' packages/agents/agent ;;
        tsc-agent-ui)     run_tsc tsc-agent-ui 'tsc --noEmit @tsdi/agent-ui' packages/agents/agent-ui ;;
        tsc-agent-gateway) run_tsc tsc-agent-gateway 'tsc --noEmit @tsdi/agent-gateway' packages/agents/agent-gateway ;;
        tsc-agent-tools)  run_tsc tsc-agent-tools 'tsc --noEmit @tsdi/agent-tools' packages/agents/agent-tools ;;
        dom-gate)         run_harness dom-gate 'DOM gate (JSDOM, 4 scenarios)' run-dom-gate.ts ;;
        tui-gate)         run_harness tui-gate 'TUI gate (text stream, 4 scenarios)' run-tui-gate.ts ;;
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
            components components-console components-html
            tsc-agent tsc-agent-ui tsc-agent-gateway tsc-agent-tools
            dom-gate tui-gate pty-acceptance diff-check"

if [ "$#" -gt 0 ]; then
    STAGES="$*"
else
    STAGES="$ALL_STAGES"
fi

echo "=== agents gate start ($(date -u +%Y-%m-%dT%H:%M:%SZ)) ==="
for stage in $STAGES; do
    run_stage "$stage"
done
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
if [ "$FAIL_COUNT" -eq 0 ]; then
    echo "=== agents gate summary: PASS ($PASS_COUNT passed, $SKIP_COUNT skipped, $TOTAL total) ==="
else
    echo "=== agents gate summary: FAIL ($FAIL_COUNT failed:${FAILED_STAGES}, $PASS_COUNT passed, $SKIP_COUNT skipped, $TOTAL total) ==="
fi
exit "$FAIL_COUNT"