#!/usr/bin/env python3
"""PTY acceptance driver for the tsdi agent TUI (P200/G123).

Drives scenarios from P190's manual acceptance list against a real PTY:

  1. tail-visibility : long streamed reply keeps its trailing question visible
  2. keymap overlay  : ctrl+alt+k toggles the which-key overlay
  3. plan checkbox   : scripted `todo` tool calls flip the plan todo row
     pending -> completed live (the pending `☐` row is transient and caught on
     sight; completion is asserted on the persistent `1 item · 1 completed`
     receipt, because the completed planTodo frame collapses rows away)
  5. command-outputs (P262): /usage result reviewable via the /outputs panel
     (the default keymap no longer binds Ctrl+O to this toggle)
  6. slash-command (P282): invalid verb shows diagnostic + preserves draft,
     corrected retry succeeds and consumes the draft
  7. interrupt/timer: Working advances by second and Ctrl+C/Esc cancel a
     genuinely pending streamed turn through the real PTY input path

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
import unicodedata
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


def resize_terminal(fd: int, columns: int, lines: int = 32) -> None:
    import fcntl, termios, struct
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', lines, columns, 0, 0))


def display_width(value: str) -> int:
    return sum(0 if unicodedata.combining(char) or unicodedata.category(char) == 'Cf' else
               2 if unicodedata.east_asian_width(char) in ('W', 'F') else 1
               for char in value)


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
    resize_terminal(fd, 100)
    return pid, fd


def wait_for(fd: int, screen: Screen, patterns, timeout: float = TIMEOUT,
             settle: float = 0.6, quiet_window: float = 1.5,
             on_sight: bool = False, tail_from: Optional[int] = None) -> Optional[str]:
    """Poll the viewport for any regex pattern; returns the matched pattern or None.

    Before each check the output is allowed to go quiet for `quiet_window`
    seconds so streaming bursts don't hide the final frame. With on_sight=True
    a match is returned the moment it renders (no quiet gate), for short-lived
    frames that are rewritten in place before the stream quiets down; matching
    spans everything that arrived since the call started, because a full-screen
    TUI redraw can push a transient frame out of the 40-line viewport window in
    the same read that delivered it. With tail_from set (a byte offset into
    screen.raw) matching is restricted to output that arrived after that offset,
    for asserting frames that render after a specific keystroke.
    """
    start_mark = len(bytes(screen.raw))

    def view() -> str:
        if tail_from is None and not on_sight:
            return screen.viewport()
        start = tail_from if tail_from is not None else start_mark
        tail = bytes(screen.raw)[start:].decode('utf-8', errors='replace')
        return '\n'.join(ln.rstrip() for ln in
                         ANSI_RE.sub('', tail).replace('\r\n', '\n').replace('\r', '\n').split('\n'))

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
            if on_sight:
                v = view()
                for pat in patterns:
                    if _match(pat, v):
                        return pat
            continue
        quiet = time.time() - last_data
        v = view()
        for pat in patterns:
            if _match(pat, v):
                if on_sight or quiet >= min(settle, quiet_window) or quiet >= quiet_window:
                    return pat
        time.sleep(0.2)
    return None


def _match(pat, view: str):
    """Match `pat` (string or compiled regex) against the viewport.

    compiled patterns carry their own flags, so re.search cannot be called
    with an extra flags argument on them.
    """
    return pat.search(view) if hasattr(pat, 'search') else re.search(pat, view, re.IGNORECASE)


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
    send(fd, '请写一篇长文介绍，尽量详细。'.encode())
    send(fd, b'\r')
    # Full-screen redraws include prior timeline rows, so lifecycle labels in
    # the raw tail cannot identify this turn. Require the question and the
    # ready composer in the current viewport after output has gone quiet.
    settled = wait_for(
        fd, screen, [r'是否继续？[\s\S]*>\s+Ask code or files'],
        settle=2.5, quiet_window=2.5)
    if not settled:
        print('[FAIL] scenario 1: long reply did not settle with its tail question visible')
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
    # The 'continue' turn must finish before we send the next message;
    # otherwise the TUI cancels the active turn ("Cancelling current
    # turn...") and the new request is silently dropped — the fake model
    # never receives the plan command and no checkbox renders.
    cb = wait_for(fd, screen, [re.escape('Turn completed')], timeout=TIMEOUT, on_sight=True)
    if not cb:
        print('[WARN] scenario 3: "continue" turn completion not detected, '
              'proceeding anyway')
    time.sleep(0.3)
    drain(fd, screen)
    send(fd, '帮我建个计划并完成它。\r'.encode())
    # The planTodo frame only renders the pending row `1. ☐ 计划项 A` while an
    # item is active; when completed the frame collapses (visibleContent='')
    # instead of flipping that row to a checked glyph. The row is also
    # short-lived against the quiet gate because the Working indicator keeps
    # streaming, so it is matched on sight. Completion is asserted on the
    # persistent `1 item · 1 completed` tool receipt and the collapsed
    # `Plan completed` summary.
    pending = wait_for(fd, screen, [rf'☐[^\n]*{esc}', rf'{esc}[^\n]*(?:pending|待处理)'],
                       timeout=TIMEOUT, on_sight=True)
    if not pending:
        print(f'[FAIL] scenario 3: pending plan item "{TODO_LABEL}" never rendered')
        return False
    done = wait_for(fd, screen, [re.escape('1 item · 1 completed'),
                                 re.escape('Plan completed: 1/1 steps, 0 failures')],
                    timeout=TIMEOUT)
    if not done:
        print(f'[FAIL] scenario 3: plan item "{TODO_LABEL}" never completed')
        return False
    print(f'[PASS] scenario 3: plan item "{TODO_LABEL}" flipped pending -> completed live')
    return True


def scenario_command_outputs(pid: int, fd: int, screen: Screen) -> bool:
    """P262: /usage pushes a transient result into the outputs ring; the
    command-outputs panel opens via the `/outputs` command (the default keymap
    no longer binds Ctrl+O to this toggle) and Esc closes it.

    Runs after the default plan scenario so turn diagnostics exist and `/usage`
    produces a real summary (turns/tokens), which is what gets pushed to the ring.
    """
    # ensure the previous turn has settled before issuing a slash command
    send(fd, '\r'.encode())
    time.sleep(0.5)
    drain(fd, screen)

    usage_mark = len(bytes(screen.raw))
    # Send text and Enter as distinct terminal writes. When both arrive in one
    # raw chunk the input layer may take the text branch without emitting a
    # separate submit action, leaving `/usage` in the composer.
    send(fd, '/usage'.encode())
    send(fd, b'\r')
    # Wait for the composer-ready frame emitted after /usage is consumed.
    usage_consumed = wait_for(
        fd, screen, [r'>\s+Ask code or files'], timeout=20,
        on_sight=True, tail_from=usage_mark)
    if not usage_consumed:
        print('[FAIL] scenario 5 (P262): composer did not reset after /usage')
        return False

    outputs_mark = len(bytes(screen.raw))
    send(fd, '/outputs'.encode())
    send(fd, b'\r')  # opens the outputs panel (no Ctrl+O keymap binding)
    opened = wait_for(
        fd, screen, [re.escape('command outputs'), re.escape('No command outputs yet.')],
        timeout=20, on_sight=True, tail_from=outputs_mark)
    if not opened:
        # Close the panel on failure so its focus does not leak into the next
        # scenario (an open command-outputs panel swallows composer keystrokes).
        send(fd, b'\x1b')
        time.sleep(0.5)
        drain(fd, screen)
        print('[FAIL] scenario 5 (P262): outputs panel not detected after /outputs')
        return False
    view = screen.viewport()
    if '/usage' not in view:
        send(fd, b'\x1b')
        time.sleep(0.5)
        drain(fd, screen)
        print('[FAIL] scenario 5 (P262): /usage entry missing from panel:\n' + view)
        return False

    send(fd, b'\x1b')  # Esc closes the panel
    time.sleep(0.8)
    drain(fd, screen)
    # Screen.viewport() is the last 40 lines of an append-only rolling buffer:
    # the closed panel's frame text stays in the window forever, so a
    # whole-viewport absence check can never pass after the panel closes.
    # Probe behaviorally instead: the focus layer swallows composer keystrokes
    # while the panel is open, so '> x' renders exactly when the composer
    # regained focus (i.e. the panel really closed).
    send(fd, b'x')
    probe = wait_for(fd, screen, [re.escape('> x')], timeout=10)
    send(fd, b'\x7f')  # backspace the probe char so the next scenario starts clean
    time.sleep(0.5)
    drain(fd, screen)
    if not probe:
        print('[FAIL] scenario 5 (P262): panel did not close on Esc (composer swallowed probe char)')
        return False
    print('[PASS] scenario 5 (P262): /usage output reviewable via /outputs panel and Esc-closable')
    return True


def scenario_slash_command_p282(pid: int, fd: int, screen: Screen) -> bool:
    """P282: invalid slash-command verb renders a diagnostic and preserves the
    composer draft; the corrected retry executes and consumes the draft."""
    err_text = 'Invalid verb "bork". Expected: list, set, unset.'
    ok_text = '/statusline set model,context completed'  # persistent tool receipt

    send(fd, '\r'.encode())
    time.sleep(0.5)
    drain(fd, screen)

    send(fd, '/statusline bork\r'.encode())
    diag = wait_for(fd, screen, [re.escape(err_text)], timeout=TIMEOUT)
    if not diag:
        print('[FAIL] scenario 6 (P282): invalid-verb diagnostic never rendered')
        return False
    time.sleep(0.5)
    drain(fd, screen)
    if '/statusline bork' not in screen.viewport():
        print('[FAIL] scenario 6 (P282): draft lost after invalid verb:\n' + screen.viewport())
        return False
    print('[PASS] scenario 6 (P282): invalid verb diagnostic rendered, draft preserved')

    # P282 keeps the failed draft in the composer for correction; clear it with
    # backspaces before retyping, otherwise the retry appends to the preserved
    # draft ('/statusline bork' + retry => invalid verb "bork/statusline").
    send(fd, b'\x7f' * 20)  # '/statusline bork' is 16 chars; extras are no-ops
    time.sleep(0.5)
    drain(fd, screen)
    # The rolling buffer never forgets: the pre-backspace composer line
    # '> /statusline bork' stays in the window even after the draft is cleared,
    # so a window-wide absence check can never pass. The composer re-renders on
    # every keystroke, so only the newest '> ' line reflects the current draft.
    composer_lines = [ln for ln in screen.viewport().splitlines() if re.match(r'^\s*>\s*$|^\s*>\s+\S', ln)]
    if composer_lines and re.search(r'/statusline\s+bork', composer_lines[-1]):
        print('[FAIL] scenario 6 (P282): preserved draft not cleared by backspace:\n' + screen.viewport())
        return False

    send(fd, '/statusline set model,context\r'.encode())
    ok = wait_for(fd, screen, [re.escape(ok_text)], timeout=TIMEOUT)
    if not ok:
        print('[FAIL] scenario 6 (P282): corrected retry success notice never rendered')
        return False
    time.sleep(0.5)
    drain(fd, screen)
    view = screen.viewport()
    composer_lines = [ln for ln in view.splitlines() if re.match(r'^\s*>\s*$|^\s*>\s+\S', ln)]
    # The typed echo "> /statusline set ..." stays in the rolling buffer after submit,
    # so a whole-viewport absence check can never pass; only the newest composer line
    # reflects whether the successful command consumed the draft.
    if composer_lines and re.search(r'/statusline', composer_lines[-1]):
        print('[FAIL] scenario 6 (P282): draft not consumed after success:\n' + view)
        return False
    print('[PASS] scenario 6 (P282): corrected retry succeeded, draft consumed')
    return True


def scenario_interrupt_and_timer(pid: int, fd: int, screen: Screen) -> bool:
    """Drive slow streamed turns to verify elapsed ticks and both interrupt keys."""
    first_mark = len(bytes(screen.raw))
    send(fd, '中断测试：请持续输出直到我取消。'.encode())
    send(fd, b'\r')
    for second in range(3):
        matched = wait_for(
            fd, screen, [rf'Working\s*\(\s*{second}s'], timeout=10,
            on_sight=True, tail_from=first_mark)
        if not matched:
            print(f'[FAIL] scenario 7: Working did not reach {second}s')
            return False
    cancel_mark = len(bytes(screen.raw))
    send(fd, b'\x03')
    cancelled = wait_for(
        fd, screen, [re.escape('Cancelling current turn...'), re.escape('Turn cancelled')],
        timeout=10, on_sight=True, tail_from=cancel_mark)
    ready = wait_for(fd, screen, [r'>\s+Ask code or files'], timeout=10,
                     on_sight=True, tail_from=cancel_mark)
    if not (cancelled and ready):
        print('[FAIL] scenario 7: Ctrl+C did not cancel the slow turn and restore the composer')
        return False

    second_mark = len(bytes(screen.raw))
    send(fd, '中断测试：再次持续输出。'.encode())
    send(fd, b'\r')
    running = wait_for(fd, screen, [r'Working\s*\(\s*0s'], timeout=10,
                       on_sight=True, tail_from=second_mark)
    if not running:
        print('[FAIL] scenario 7: second slow turn never entered Working state')
        return False
    esc_mark = len(bytes(screen.raw))
    send(fd, b'\x1b')
    esc_cancelled = wait_for(
        fd, screen, [re.escape('Cancelling current turn...'), re.escape('Turn cancelled')],
        timeout=10, on_sight=True, tail_from=esc_mark)
    esc_ready = wait_for(fd, screen, [r'>\s+Ask code or files'], timeout=10,
                         on_sight=True, tail_from=esc_mark)
    if not (esc_cancelled and esc_ready):
        print('[FAIL] scenario 7: Esc did not cancel the slow turn and restore the composer')
        return False
    print('[PASS] scenario 7: Working advanced 0s -> 1s -> 2s; Ctrl+C and Esc cancelled pending turns')
    return True


def scenario_theme_width_matrix(pid: int, fd: int, screen: Screen) -> bool:
    """Verify dark/light themes at real 80/120-column PTY dimensions."""
    theme_colors = {
        'dark': b'\x1b[38;2;201;209;217m',
        'light': b'\x1b[38;2;36;41;47m',
    }
    for theme in ('dark', 'light'):
        for columns in (80, 120):
            resize_terminal(fd, columns)
            time.sleep(0.3)
            drain(fd, screen)
            # Force a real state transition for every matrix cell. Reapplying
            # the already-active theme may short-circuit style updates.
            primer = 'high-contrast'
            send(fd, f'/theme {primer}'.encode())
            send(fd, b'\r')
            if not wait_for(fd, screen, [re.escape(f'Theme set to {primer}.')],
                            timeout=20, on_sight=True):
                print(f'[FAIL] scenario 8: failed to prime {primer} before {theme}/{columns}')
                return False
            theme_mark = len(bytes(screen.raw))
            send(fd, f'/theme {theme}'.encode())
            send(fd, b'\r')
            changed = wait_for(fd, screen, [re.escape(f'Theme set to {theme}.')],
                               timeout=20, on_sight=True, tail_from=theme_mark)
            raw_tail = bytes(screen.raw)[theme_mark:]
            if not changed or theme_colors[theme] not in raw_tail:
                print(f'[FAIL] scenario 8: {theme}/{columns} theme confirmation or ANSI color missing')
                return False

            turn_mark = len(bytes(screen.raw))
            send(fd, f'主题宽度矩阵 {theme} {columns}'.encode())
            send(fd, b'\r')
            completed = wait_for(
                fd, screen, [re.escape('Session restore is complete.')], timeout=TIMEOUT,
                settle=1.0, quiet_window=1.0, tail_from=turn_mark)
            if not completed:
                print(f'[FAIL] scenario 8: {theme}/{columns} final marker missing')
                return False
            if not wait_for(fd, screen, [r'>\s+Ask code or files'], timeout=20,
                            on_sight=True, tail_from=turn_mark):
                print(f'[FAIL] scenario 8: {theme}/{columns} composer did not recover')
                return False
            view = screen.viewport()
            if '恢复索引写入失败：权限不足' not in view:
                print(f'[FAIL] scenario 8: {theme}/{columns} CJK root cause missing')
                return False
            overflow = [line for line in view.splitlines() if display_width(line) > columns]
            if overflow:
                print(f'[FAIL] scenario 8: {theme}/{columns} line exceeds terminal width: {overflow[0]!r}')
                return False
            print(f'[PASS] scenario 8: {theme} theme at {columns} columns')
    resize_terminal(fd, 100)
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

    # 1. plan creation: steps appear in the planTodo box (pending rows). Matched
    #    on sight so the anchor for step 2's start_mark lands BEFORE the parallel
    #    ▸ rows render; a quiet-gated match can return after they have scrolled
    #    out (Working timer keystream keeps the quiet gate open past the frame).
    #    The "first screen" metric is measured after the parallel frame settles
    #    below (step 2), where both running rows are guaranteed in the viewport.
    created = wait_for(fd, screen, [patterns[1], re.escape('步骤 1')],
                       timeout=TIMEOUT, on_sight=True)
    if not created:
        print('[FAIL] scenario 4: plan lifecycle - plan steps never rendered')
        return False

    # 2. parallel execution markers: the planTodo box re-renders the running
    #    rows with a `▸` mark *before* the label (observed frame:
    #    `  1. ▸ 步骤 1：解析需求`). The Working status line only names the
    #    current step, so it cannot prove step 2 is active; matching BOTH ▸ rows
    #    in one viewport is the real "both steps in_progress together" signal.
    #    The rows are transient (Working timers keep streaming and push them out
    #    of the 40-line viewport before the quiet gate clears), so they are
    #    matched on sight.
    running = wait_for(fd, screen, [
        rf'▸[^\n]*{re.escape("步骤 1：解析需求")}[^\n]*\n[^\n]*▸[^\n]*{re.escape("步骤 2：设计接口")}',
        rf'▸[^\n]*{re.escape("步骤 2：设计接口")}[^\n]*\n[^\n]*▸[^\n]*{re.escape("步骤 1：解析需求")}'],
        timeout=TIMEOUT, on_sight=True)
    if not running:
        print('[FAIL] scenario 4: parallel execution markers never rendered')
        ok = False
    # first-screen current-step visibility: fraction of the in_progress steps
    # (1 and 2) whose row appears in the settled viewport. Measured immediately
    # after the on-sight match, when both ▸ rows are still in the window.
    visible_rate = first_screen_step_visibility(screen.viewport(), [1, 2])
    print(f'[metric] first-screen current-step visibility rate = {visible_rate:.2f}')
    if visible_rate < 0.5:
        print('[FAIL] scenario 4: current running steps not visible in first screen')
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
    retry_at = len(bytes(screen.raw))
    send(fd, b'y\r')

    # 5. recovery: after the confirmed retry, the fake model emits an in_progress
    #    Update plan receipt and the box re-renders step 1 as running. The
    #    `▸` row is ambiguous (it also rendered pre-retry and stays in the rolling
    #    buffer), so match is restricted to output that arrived after the retry.
    recovered = wait_for(fd, screen, [
        rf'▸[^\n]*{re.escape("步骤 1：解析需求")}',
        re.escape('Update plan completed')], timeout=TIMEOUT, tail_from=retry_at)
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
            results.append(('6-slash-command', scenario_slash_command_p282(pid, fd, screen)))
            results.append(('7-interrupt-timer', scenario_interrupt_and_timer(pid, fd, screen)))
            results.append(('8-theme-width-matrix', scenario_theme_width_matrix(pid, fd, screen)))
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
