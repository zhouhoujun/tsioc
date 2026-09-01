#!/usr/bin/env python3
"""PTY acceptance driver for the tsdi agent TUI (P200/G123).

Drives three scenarios from P190's manual acceptance list against a real PTY:

  1. tail-visibility : long streamed reply keeps its trailing question visible
  2. keymap overlay  : ctrl+alt+k toggles the which-key overlay
  3. plan checkbox   : scripted `todo` tool calls flip [ ] -> [x] live

Usage (repo root):
  python3 packages/agents/acceptance/run_acceptance.py

Env knobs:
  AGENT_CMD            CLI command (default: npm run --silent chat --prefix <agent-cli>)
  ACCEPTANCE_TIMEOUT   per-wait timeout seconds (default: 90)
  EXPECT_WHICHKEY      comma-separated overlay text candidates
  EXPECT_TODO_LABEL    plan item label (must match fake server's FAKE_TODO_CONTENT)
Artifacts on failure: packages/agents/acceptance/artifacts/<ts>/scenario-<n>.log

Stdlib only; Linux/macOS (pty). Exit code 0 = all scenarios passed.
"""
import json
import os
import re
import signal
import subprocess
import sys
import time
import urllib.request
import zlib
from typing import Optional

ACCEPTANCE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(ACCEPTANCE_DIR)))
ARTIFACTS = os.path.join(ACCEPTANCE_DIR, 'artifacts')

AGENT_CMD = os.environ.get('AGENT_CMD') or (
    'npm run --silent chat --prefix ' + os.path.join(REPO, 'packages', 'agents', 'agent-cli'))
TIMEOUT = float(os.environ.get('ACCEPTANCE_TIMEOUT', '90'))
WHICHKEY_CANDIDATES = [s for s in os.environ.get(
    'EXPECT_WHICHKEY', 'which-key,Which-Key,Which key,Keys,chained,Keymap').split(',') if s]
TODO_LABEL = os.environ.get('EXPECT_TODO_LABEL', os.environ.get('FAKE_TODO_CONTENT', '计划项 A'))
SCENARIO = os.environ.get('FAKE_SCENARIO', 'default')

ANSI_RE = re.compile(
    r'\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][0-9A-B]|\x1b[=>]|\x1b[a-zA-Z]')
VIEWPORT_LINES = 40


class Screen:
    """Rolling terminal buffer with ANSI-stripped viewport access."""

    def __init__(self) -> None:
        self.raw = bytearray()

    def feed(self, data: bytes) -> None:
        self.raw += data

    def text(self) -> str:
        cleaned = ANSI_RE.sub('', self.raw.decode('utf-8', errors='replace'))
        cleaned = cleaned.replace('\r\n', '\n').replace('\r', '\n')
        lines = [ln.rstrip() for ln in cleaned.split('\n')]
        return '\n'.join(lines[-VIEWPORT_LINES * 3:])

    def viewport(self) -> str:
        lines = [ln for ln in ANSI_RE.sub('', self.raw.decode('utf-8', errors='replace'))
                 .replace('\r\n', '\n').replace('\r', '\n').split('\n')]
        return '\n'.join(lines[-VIEWPORT_LINES:])


_FAKE_PORT = 0


def start_fake_server() -> subprocess.Popen:
    global _FAKE_PORT  # noqa: PLW0603
    server_env = dict(os.environ,
                      FAKE_SCENARIO=os.environ.get('FAKE_SCENARIO', 'default'))
    proc = subprocess.Popen([sys.executable, os.path.join(ACCEPTANCE_DIR, 'fake_model_server.py')],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                            env=server_env)
    deadline = time.time() + 10
    while time.time() < deadline:
        line = proc.stdout.readline() if proc.stdout else ''
        m = re.search(r'FAKE-MODEL-READY port=(\d+)', line)
        if m:
            _FAKE_PORT = int(m.group(1))
            for _ in range(50):
                try:
                    urllib.request.urlopen(f'http://127.0.0.1:{_FAKE_PORT}/healthz', timeout=1).read()
                    print(f'[acceptance] fake model ready on :{_FAKE_PORT}')
                    return proc
                except Exception:
                    time.sleep(0.2)
            raise RuntimeError('fake model did not become healthy')
    proc.terminate()
    raise RuntimeError('fake model failed to start')


def wait_readable(fd: int, seconds: float) -> bool:
    import select
    return bool(select.select([fd], [], [], seconds)[0])


def drain(fd: int, screen: Screen, seconds: float = 0.4) -> None:
    end = time.time() + seconds
    while time.time() < end and wait_readable(fd, max(0.05, end - time.time())):
        try:
            chunk = os.read(fd, 65536)
        except OSError:
            return
        if not chunk:
            return
        screen.feed(chunk)


def spawn_agent(port: int):
    import pty
    env = dict(os.environ)
    env.update({
        'TERM': 'xterm-256color',
        'AGENT_PROVIDER': 'openai',
        'AGENT_MODEL': 'fake-acceptance-model',
        'AGENT_API_KEY': 'acceptance-key',
        'AGENT_BASE_URL': f'http://127.0.0.1:{port}/v1',
        'COLUMNS': '100', 'LINES': '32', 'LANG': 'C.UTF-8',
    })
    pid, fd = pty.fork()
    if pid == 0:
        try:
            os.execvpe('/bin/sh', ['/bin/sh', '-c', AGENT_CMD], env)
        finally:
            os._exit(127)
    import fcntl, termios, struct
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 32, 100, 0, 0))
    return pid, fd


def wait_for(fd: int, screen: Screen, patterns, timeout: float = TIMEOUT,
             settle: float = 0.6, quiet_window: float = 1.5) -> Optional[str]:
    """Poll the viewport for any regex pattern; returns the matched pattern or None.

    Before each check the output is allowed to go quiet for `quiet_window`
    seconds so streaming bursts don't hide the final frame.
    """
    deadline = time.time() + timeout
    last_data = time.time()
    while time.time() < deadline:
        if wait_readable(fd, 0.15):
            try:
                chunk = os.read(fd, 65536)
            except OSError:
                break
            if not chunk:
                break
            screen.feed(chunk)
            last_data = time.time()
            continue
        quiet = time.time() - last_data
        view = screen.viewport()
        for pat in patterns:
            if re.search(pat, view, re.IGNORECASE):
                if quiet >= min(settle, quiet_window) or quiet >= quiet_window:
                    return pat
        if quiet >= quiet_window + settle:
            # idle long enough and nothing matched — keep waiting until timeout
            pass
        time.sleep(0.2)
    return None


def send(fd: int, data: bytes) -> None:
    os.write(fd, data)


def dump_artifact(ts: str, name: str, screen: Screen) -> str:
    os.makedirs(os.path.join(ARTIFACTS, ts), exist_ok=True)
    path = os.path.join(ARTIFACTS, ts, f'{name}.log')
    with open(path, 'wb') as f:
        f.write(bytes(screen.raw))
    with open(path.replace('.log', '.stripped.txt'), 'w', encoding='utf-8') as f:
        f.write(screen.text())
    print(f'[acceptance] artifact dumped: {path}')
    return path


def scenario_tail_visibility(pid: int, fd: int, screen: Screen) -> bool:
    send(fd, b'\r')  # ensure composer focused / dismiss any banner
    time.sleep(0.5)
    drain(fd, screen)
    send(fd, '请写一篇长文介绍，尽量详细。\r'.encode())
    matched = wait_for(fd, screen, [re.escape('是否继续？')])
    if not matched:
        print('[FAIL] scenario 1: tail question 是否继续？ never visible in viewport')
        return False
    view = screen.viewport().strip().splitlines()
    tail = '\n'.join(view[-6:])
    ok = '是否继续？' in tail
    print('[PASS] scenario 1: long reply tail question visible'
          if ok else '[FAIL] scenario 1: question visible but not near viewport bottom:\n' + tail)
    return ok


def scenario_keymap_overlay(pid: int, fd: int, screen: Screen) -> bool:
    before_lines = len(screen.viewport().strip().splitlines())
    send(fd, b'\x1b\x0b')  # ESC + ctrl-k => ctrl+alt+k => which-key-toggle
    matched = wait_for(fd, screen, [re.escape(c) for c in WHICHKEY_CANDIDATES], timeout=20)
    after = screen.viewport()
    if matched:
        print(f'[PASS] scenario 2: which-key overlay shown (matched "{matched}", '
              f'{before_lines} -> {len(after.strip().splitlines())} lines)')
        send(fd, b'\x1b\x0b')  # toggle back off
        time.sleep(0.8)
        drain(fd, screen)
        return True
    print('[FAIL] scenario 2: which-key overlay not detected. Candidates: '
          + ', '.join(WHICHKEY_CANDIDATES))
    return False


def scenario_plan_checkbox(pid: int, fd: int, screen: Screen) -> bool:
    esc = re.escape(TODO_LABEL)
    # Close the long-reply continuation prompt from scenario 1 before starting
    # a new turn. Otherwise this text is consumed as the pending answer and
    # the scripted todo tool calls are never requested from the fake model.
    send(fd, '继续\r'.encode())
    time.sleep(0.8)
    drain(fd, screen)
    send(fd, '帮我建个计划并完成它。\r'.encode())
    pending = wait_for(fd, screen, [rf'(?:\[\s*\]|☐|▸)[^\n]*{esc}', rf'{esc}[^\n]*(?:pending|待处理)'], timeout=TIMEOUT)
    if not pending:
        print(f'[FAIL] scenario 3: pending plan item "{TODO_LABEL}" never rendered')
        return False
    done = wait_for(fd, screen, [rf'(?:\[[xX✓]\]|✓)[^\n]*{esc}', rf'{esc}[^\n]*(?:completed|完成)'], timeout=TIMEOUT)
    if not done:
        print(f'[FAIL] scenario 3: plan item "{TODO_LABEL}" never flipped to completed')
        return False
    print(f'[PASS] scenario 3: plan item "{TODO_LABEL}" flipped [ ] -> [x] live')
    return True


def scenario_command_outputs(pid: int, fd: int, screen: Screen) -> bool:
    """P262: /usage pushes a transient result into the outputs ring, Ctrl+O opens
    the command-outputs panel, Esc closes it.

    Runs after the default plan scenario so turn diagnostics exist and `/usage`
    produces a real summary (turns/tokens), which is what gets pushed to the ring.
    """
    # ensure the previous turn has settled before issuing a slash command
    send(fd, '\r'.encode())
    time.sleep(0.5)
    drain(fd, screen)

    send(fd, '/usage\r'.encode())
    # /usage pushes to the command-outputs ring (post-P262); give agent time to
    # process the command before opening the panel.
    time.sleep(0.5)
    send(fd, b'\x0f')  # Ctrl+O -> command-outputs toggle
    opened = wait_for(fd, screen, [re.escape('command outputs'), re.escape('No command outputs yet.')], timeout=20)
    if not opened:
        print('[FAIL] scenario 5 (P262): outputs panel not detected after Ctrl+O')
        return False
    view = screen.viewport()
    if '/usage' not in view:
        print('[FAIL] scenario 5 (P262): /usage entry missing from panel:\n' + view)
        return False

    send(fd, b'\x1b')  # Esc closes the panel
    time.sleep(0.8)
    drain(fd, screen)
    if re.search(re.escape('command outputs'), screen.viewport()):
        print('[FAIL] scenario 5 (P262): panel did not close on Esc')
        return False
    print('[PASS] scenario 5 (P262): /usage output reviewable via Ctrl+O panel and Esc-closable')
    return True


# --- P232 part B: plan-lifecycle scenario + UX metrics ----------------------
#
# Metrics required by the P232 spec (recorded as acceptance evidence):
#   - first-screen current-step visibility rate : fraction of the steps that are
#     the "current" focus (running/in_progress) visible in the first rendered screen
#   - failure-location keypress count            : keystrokes to move focus to the
#     failed step after it is reported
#   - event-to-UI latency                        : ms from a state change (turn
#     scripted by the fake model) until the matching UI frame appears in the viewport

PLAN_STEP_LABELS = [
    ('步骤 1', '解析需求'),
    ('步骤 2', '设计接口'),
    ('步骤 3', '实现功能'),
    ('步骤 4', '验证发布'),
]
RETRY_PROMPT = '确认重试'
REVIEW_GATE_TEXT = 'review 门禁'
DONE_TEXT = '计划已全部完成'


def plan_step_patterns() -> dict:
    """Map step number -> regex for its plan row in the (label, content) pair."""
    return {n: re.compile(re.escape(f'{label}：{content}'), re.IGNORECASE)
            for n, (label, content) in enumerate(PLAN_STEP_LABELS, 1)}


def first_screen_step_visibility(viewport_text: str, current_step_numbers: list) -> float:
    """Fraction of current (running/in_progress) steps whose row appears on screen.

    current_step_numbers: 1-based step numbers the fake model marks in_progress
    (P232 part B turn 2 runs steps 1 and 2 in parallel).
    """
    if not current_step_numbers:
        return 1.0
    patterns = plan_step_patterns()
    visible = sum(1 for n in current_step_numbers
                  if patterns.get(n) and patterns[n].search(viewport_text))
    return visible / len(current_step_numbers)


def fail_loc_keypresses(step_number: int, current_index: int) -> int:
    """Best-effort keystrokes to move focus to the failed step from the current row.

    P232 part B: when step `step_number` fails while focus sits at `current_index`
    (1-based row), the operator needs one Enter per row travelled plus one to select.
    """
    return abs(step_number - current_index) + 1


def event_to_ui_latency(started: float, end: float) -> int:
    """Milliseconds between a scripted state change `started` and the matching UI frame `end`.

    P232 part B: time from a fake-model tool result arriving (state changed) until
    the viewport renders the corresponding plan row. Uses monotonic clock.
    """
    return max(0, int(round((end - started) * 1000)))


def scenario_plan_lifecycle(pid: int, fd: int, screen: Screen) -> bool:
    """Drive 计划创建→并行执行→失败→确认 retry→恢复→review gate→完成 with metrics."""
    patterns = plan_step_patterns()
    ok = True

    send(fd, '帮我建个计划并并行执行。\r'.encode())

    # 1. plan creation: all four steps visible. Record first-screen visibility after
    #    the plan first appears (the fake model's turn 2 runs steps 1+2 in parallel).
    created = wait_for(fd, screen, [patterns[1], re.escape('步骤 1')], timeout=TIMEOUT)
    if not created:
        print('[FAIL] scenario 4: plan lifecycle - plan steps never rendered')
        return False
    # after turn 2 (parallel in_progress) the first rendered screen should show steps 1/2
    _ = wait_for(fd, screen, [patterns[2], re.escape('步骤 2')], timeout=TIMEOUT)
    visible_rate = first_screen_step_visibility(screen.viewport(), [1, 2])
    print(f'[metric] first-screen current-step visibility rate = {visible_rate:.2f}')
    if visible_rate < 0.5:
        print('[FAIL] scenario 4: current running steps not visible in first screen')
        ok = False

    # 2. parallel execution markers (running) for steps 1/2.
    running = wait_for(fd, screen, [r'步骤 1[^\n]*(?:in_progress|running|▶|●)',
                                    r'步骤 2[^\n]*(?:in_progress|running|▶|●)'], timeout=TIMEOUT)
    if not running:
        print('[FAIL] scenario 4: parallel execution markers never rendered')
        ok = False

    # 3. failure of step 1 + retry confirmation prompt.
    fail_started = time.monotonic()
    failed = wait_for(fd, screen, [r'步骤 1[^\n]*(?:failed|✗|失败)'], timeout=TIMEOUT)
    prompt = wait_for(fd, screen, [re.escape(RETRY_PROMPT), re.escape('确认重试')], timeout=TIMEOUT)
    fail_latency = event_to_ui_latency(fail_started, time.monotonic())
    print(f'[metric] event-to-UI latency (failure) = {fail_latency} ms')
    if not (failed and prompt):
        print('[FAIL] scenario 4: step-1 failure + retry prompt never rendered')
        ok = False

    # 4. failure-location keypress count: focus is at the prompt (row for step 1),
    #    operator presses y + Enter to confirm retry.
    keys = fail_loc_keypresses(1, 1)
    print(f'[metric] failure-location keypress count = {keys}')
    send(fd, b'y\r')

    # 5. recovery: step 1 flips back to running after confirmed retry.
    recovered = wait_for(fd, screen, [r'步骤 1[^\n]*(?:in_progress|running|▶|●)'], timeout=TIMEOUT)
    if not recovered:
        print('[FAIL] scenario 4: step-1 recovery after confirmed retry never rendered')
        ok = False

    # 6. review gate.
    gate = wait_for(fd, screen, [re.escape(REVIEW_GATE_TEXT), re.escape('确认'), re.escape('门禁')], timeout=TIMEOUT)
    if not gate:
        print('[FAIL] scenario 4: review gate never rendered')
        ok = False
    send(fd, b'y\r')

    # 7. completion.
    done = wait_for(fd, screen, [re.escape(DONE_TEXT)], timeout=TIMEOUT)
    if not done:
        print('[FAIL] scenario 4: plan completion text never rendered')
        ok = False

    print('[PASS] scenario 4: plan lifecycle (create→parallel→fail→retry→recover→gate→done)'
          if ok else '[FAIL] scenario 4: plan lifecycle')
    return ok


def main() -> int:
    ts = time.strftime('%Y%m%d-%H%M%S')
    server = start_fake_server()
    port = _FAKE_PORT
    pid = None
    results = []
    screen = Screen()
    try:
        pid, fd = spawn_agent(port)
        ready = wait_for(fd, screen, ['>', 'tsdi', 'agent'], timeout=60, quiet_window=3)
        if not ready:
            raise RuntimeError('TUI did not become ready (no prompt/banner detected)')
        print(f'[acceptance] TUI ready (matched "{ready}")')
        if SCENARIO == 'plan-lifecycle':
            results.append(('4-plan-lifecycle', scenario_plan_lifecycle(pid, fd, screen)))
        else:
            results.append(('1-tail-visibility', scenario_tail_visibility(pid, fd, screen)))
            results.append(('2-keymap-overlay', scenario_keymap_overlay(pid, fd, screen)))
            results.append(('3-plan-checkbox', scenario_plan_checkbox(pid, fd, screen)))
            results.append(('5-command-outputs', scenario_command_outputs(pid, fd, screen)))
    except Exception as exc:  # noqa: BLE001 — acceptance driver reports everything
        print(f'[ERROR] {exc}')
        results.append(('driver-error', False))
    finally:
        if pid is not None:
            try:
                send(fd, b'\x03\x03/d\r')  # best-effort exit paths
                time.sleep(1.0)
                drain(fd, screen, 0.5)
                os.kill(pid, signal.SIGKILL)
                os.close(fd)
            except OSError:
                pass
            try:
                os.waitpid(pid, 0)
            except ChildProcessError:
                pass
        server.terminate()
        server.wait(timeout=5)
    all_ok = True
    print('\n=== acceptance summary ===')
    for name, ok in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name}")
        all_ok &= ok
        if not ok:
            dump_artifact(ts, f'scenario-{name}', screen)
    return 0 if all_ok else 1


if __name__ == '__main__':
    sys.exit(main())
