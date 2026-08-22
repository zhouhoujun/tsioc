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

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ACCEPTANCE_DIR = os.path.join(REPO, 'packages', 'agents', 'acceptance')
ARTIFACTS = os.path.join(ACCEPTANCE_DIR, 'artifacts')

AGENT_CMD = os.environ.get('AGENT_CMD') or (
    'npm run --silent chat --prefix ' + os.path.join(REPO, 'packages', 'agents', 'agent-cli'))
TIMEOUT = float(os.environ.get('ACCEPTANCE_TIMEOUT', '90'))
WHICHKEY_CANDIDATES = [s for s in os.environ.get(
    'EXPECT_WHICHKEY', 'which-key,Which-Key,Which key,Keys,chained').split(',') if s]
TODO_LABEL = os.environ.get('EXPECT_TODO_LABEL', os.environ.get('FAKE_TODO_CONTENT', '计划项 A'))

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
    proc = subprocess.Popen([sys.executable, os.path.join(ACCEPTANCE_DIR, 'fake_model_server.py')],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
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
            os.execvp('/bin/sh', ['/bin/sh', '-c', AGENT_CMD])
        finally:
            os._exit(127)
    import fcntl, termios, struct
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 32, 100, 0, 0))
    return pid, fd


def wait_for(fd: int, screen: Screen, patterns, timeout: float = TIMEOUT,
             settle: float = 0.6, quiet_window: float = 1.5) -> str | None:
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
    send(fd, '帮我建个计划并完成它。\r'.encode())
    pending = wait_for(fd, screen, [rf'\[\s*\][^\n]*{esc}', rf'{esc}[^\n]*pending'], timeout=TIMEOUT)
    if not pending:
        print(f'[FAIL] scenario 3: pending plan item "{TODO_LABEL}" never rendered')
        return False
    done = wait_for(fd, screen, [rf'\[[xX✓]\][^\n]*{esc}', rf'{esc}[^\n]*completed'], timeout=TIMEOUT)
    if not done:
        print(f'[FAIL] scenario 3: plan item "{TODO_LABEL}" never flipped to completed')
        return False
    print(f'[PASS] scenario 3: plan item "{TODO_LABEL}" flipped [ ] -> [x] live')
    return True


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
        results.append(('1-tail-visibility', scenario_tail_visibility(pid, fd, screen)))
        results.append(('2-keymap-overlay', scenario_keymap_overlay(pid, fd, screen)))
        results.append(('3-plan-checkbox', scenario_plan_checkbox(pid, fd, screen)))
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


_FAKE_PORT = 0


if __name__ == '__main__':
    sys.exit(main())
