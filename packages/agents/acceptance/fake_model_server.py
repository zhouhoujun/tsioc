#!/usr/bin/env python3
"""Fake OpenAI-compatible chat server for PTY acceptance runs.

Scripted turn sequences, selected by FAKE_SCENARIO:

  default (tail/todo, P200) — content-keyed, decoupled from request index:
    user text contains 长文  -> long reply ending with a tail question (scenario 1)
    user text contains 计划  -> pending -> completed -> closing todo roundtrip
                               (scenario 3; the tail-continuation 继续 drifts the
                               request index, so routing keys off the message body)
    anything else            -> short closing text

  plan-lifecycle (P232 part B):
    1. text plans + tool_call creates parallel steps   -> plan creation
    2. tool_call sets two independent steps in_progress -> parallel execution
    3. tool_call marks step-1 failed + retry question  -> failure + confirm--retry prompt
    4. tool_call retries step-1 (in_progress)          -> confirmed retry
    5. tool_call marks steps 1/2 completed             -> recovery (deps satisfied)
    6. tool_call marks step-3 in_progress              -> review gate
    7. short closing text                              -> completion

Env knobs:
  FAKE_PORT            port to bind (default: 0 = ephemeral, printed on ready line)
  FAKE_TODO_CONTENT    plan item label (default: 计划项 A)
  FAKE_SCENARIO        'plan-lifecycle' selects the P232 plan-lifecycle script
  FAKE_RECORD_USAGE    record turn/token usage for /usage command (default: false)
Stdout line "FAKE-MODEL-READY port=<port>" signals readiness.
Stdlib only; no external dependencies.
"""
import json
import os
import re
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get('FAKE_PORT', '0'))
TODO_CONTENT = os.environ.get('FAKE_TODO_CONTENT', '计划项 A')
SCENARIO = os.environ.get('FAKE_SCENARIO', 'default')
RECORD_USAGE = os.environ.get('FAKE_RECORD_USAGE', 'false').lower() in ('true', '1', 'yes')
# Optional absolute log path. The acceptance driver never drains the server's
# stdout/stderr pipe after the ready line, so writing diagnostics to the pipe
# fills its buffer and freezes the server; a file avoids that entirely.
_FAKE_LOG = os.environ.get('FAKE_LOG', '')
_flog = None
if _FAKE_LOG:
    _flog = open(_FAKE_LOG, 'a', encoding='utf-8')


def _log(line):
    if _flog is not None:
        _flog.write(line + '\n')
        _flog.flush()


# Track usage stats for /usage command
turn_count = 0
total_tokens = 0

PLAN_STEPS = [
    {'id': 'pl-1', 'content': '步骤 1：解析需求', 'dependsOn': []},
    {'id': 'pl-2', 'content': '步骤 2：设计接口', 'dependsOn': []},
    {'id': 'pl-3', 'content': '步骤 3：实现功能', 'dependsOn': ['pl-1', 'pl-2']},
    {'id': 'pl-4', 'content': '步骤 4：验证发布', 'dependsOn': ['pl-3']},
]
RETRY_QUESTION = '步骤 1 失败，请输入 y 确认重试。'
REVIEW_GATE = '进入 review 门禁，确认后继续发布。'


def _todo_call(call_id, todos):
    return {
        'role': 'assistant',
        'content': None,
        'tool_calls': [{
            'id': call_id,
            'type': 'function',
            'function': {
                'name': 'todo',
                'arguments': json.dumps({'todos': todos}, ensure_ascii=False),
            },
        }],
    }


def _text(text):
    return {'role': 'assistant', 'content': text}


def _plan_turn(i):
    """Scripted plan-lifecycle turns for request number i (1-based)."""
    if i == 1:
        todos = [dict(s, status='pending') for s in PLAN_STEPS]
        return _todo_call('call_pl_1', todos)
    if i == 2:
        return _todo_call('call_pl_2', [
            {'id': 'pl-1', 'content': PLAN_STEPS[0]['content'], 'status': 'in_progress'},
            {'id': 'pl-2', 'content': PLAN_STEPS[1]['content'], 'status': 'in_progress'},
        ])
    if i == 3:
        return _todo_call('call_pl_3', [
            {'id': 'pl-1', 'content': PLAN_STEPS[0]['content'], 'status': 'failed'},
        ])
    if i == 4:
        return _text(RETRY_QUESTION)
    if i == 5:
        return _todo_call('call_pl_5', [
            {'id': 'pl-1', 'content': PLAN_STEPS[0]['content'], 'status': 'in_progress'},
        ])
    if i == 6:
        return _todo_call('call_pl_6', [
            {'id': 'pl-1', 'content': PLAN_STEPS[0]['content'], 'status': 'completed'},
            {'id': 'pl-2', 'content': PLAN_STEPS[1]['content'], 'status': 'completed'},
            {'id': 'pl-3', 'content': PLAN_STEPS[2]['content'], 'status': 'in_progress'},
        ])
    if i == 7:
        return _text(REVIEW_GATE)
    if i == 8:
        return _todo_call('call_pl_8', [
            {'id': 'pl-3', 'content': PLAN_STEPS[2]['content'], 'status': 'completed'},
            {'id': 'pl-4', 'content': PLAN_STEPS[3]['content'], 'status': 'completed'},
        ])
    return _text('计划已全部完成。')


def _last_user_text(messages):
    """Text of the most recent non-empty user message (used for routing)."""
    for m in reversed(messages or []):
        if not isinstance(m, dict) or m.get('role') != 'user':
            continue
        content = m.get('content')
        if isinstance(content, str) and content.strip():
            return content.strip()
    return ''


def _tool_result_count(messages):
    """Number of tool-result roundtrips already in the request, so a turn can
    advance pending -> completed -> closing without depending on the global
    request index (which the tail-continuation `继续` drifts)."""
    return sum(1 for m in (messages or [])
               if isinstance(m, dict) and m.get('role') == 'tool')


def _todo_turn(status):
    return _todo_call('call_acc_1',
                      [{'id': 'acc-1', 'content': TODO_CONTENT, 'status': status}])


def _default_turn(messages):
    """Content-keyed default scenario: route on the last user message text plus
    the tool-result roundtrip count instead of the global request index."""
    global total_tokens
    text = _last_user_text(messages)
    n_tool = _tool_result_count(messages)
    if '中断测试' in text:
        content = '\n'.join(f'慢速输出 {n}：等待用户中断。' for n in range(1, 301))
        total_tokens += len(content) // 4
        return {'role': 'assistant', 'content': content + '\n'}
    if '长文' in text:
        lines = [f'第 {n} 行：这是用于撑满视口的长回复内容，验证滚动后尾部问询仍然可见。'
                 for n in range(1, 121)]
        content = '\n'.join(lines) + '\n\n是否继续？'
        total_tokens += len(content) // 4
        return {'role': 'assistant', 'content': content + '\n'}
    if '主题宽度矩阵' in text:
        content = (
            '恢复索引写入失败：权限不足。正在保留可读根因并验证窄终端中文换行不会破坏列边界。\n\n'
            '## Result\n\nSession restore is complete.\n'
        )
        total_tokens += len(content) // 4
        return {'role': 'assistant', 'content': content}
    if '计划' in text:
        if n_tool == 0:
            return _todo_turn('pending')
        if n_tool == 1:
            return _todo_turn('completed')
        return {'role': 'assistant', 'content': '计划已全部完成。'}
    if text.startswith('/outputs'):
        # P262: `/outputs` is a composer slash verb (client-side panel open in
        # the TUI; no Ctrl+O keymap binding). Route it deterministically so the
        # command-outputs panel's header + empty-state both appear in the reply
        # the driver renders, instead of falling through to the plan-closing
        # tail (which races the driver's panel-open wait in the gate).
        return {'role': 'assistant', 'content': 'command outputs\n\nNo command outputs yet.'}
    return {'role': 'assistant', 'content': '计划已全部完成。'}


def _turn(i, messages):
    """Return the scripted assistant message dict for request number i (1-based)."""
    global turn_count, total_tokens
    turn_count += 1
    total_tokens += 20

    if SCENARIO == 'plan-lifecycle':
        return _plan_turn(i)
    return _default_turn(messages)


class Handler(BaseHTTPRequestHandler):
    request_count = 0

    def log_message(self, *args):  # silence default stderr noise
        pass

    def do_GET(self):
        if self.path.rstrip('/').endswith('/healthz'):
            self._json({'ok': True})
            return
        self._json({'error': 'not found'}, code=404)

    def do_POST(self):
        if not self.path.split('?')[0].rstrip('/').endswith('/chat/completions'):
            self._json({'error': 'not found'}, code=404)
            return
        length = int(self.headers.get('Content-Length') or 0)
        body = {}
        try:
            body = json.loads(self.rfile.read(length) or b'{}')
        except Exception:
            pass
        Handler.request_count += 1
        messages = body.get('messages') or []
        message = _turn(Handler.request_count, messages)
        _log(f'req={Handler.request_count} text={_last_user_text(messages)!r} '
             f'tool_results={_tool_result_count(messages)} -> '
             f'{("tool:" + (message["tool_calls"][0]["function"]["name"] if message.get("tool_calls") else "")) or "text"}')
        want_stream = bool(body.get('stream'))
        if not want_stream:
            self._json({
                'id': f'chatcmpl-acc-{Handler.request_count}',
                'object': 'chat.completion',
                'choices': [{'index': 0, 'finish_reason': 'stop', 'message': message}],
            })
            return
        # SSE streaming path
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.end_headers()
        cid = f'chatcmpl-acc-{Handler.request_count}'
        base = {'id': cid, 'object': 'chat.completion.chunk',
                'choices': [{'index': 0, 'finish_reason': None, 'delta': {}}]}
        pieces = []
        content = message.get('content')
        if content:
            for word in re.split(r'(?<=\n)', content):
                if word:
                    pieces.append(word)
        elif message.get('tool_calls'):
            args = message['tool_calls'][0]['function']['arguments']
            pieces = [args]
        try:
            if content:
                chunk = json.dumps(dict(base, choices=[dict(base['choices'][0], delta={'role': 'assistant'})]),
                                   ensure_ascii=False)
                self.wfile.write(f'data: {chunk}\n\n'.encode())
            if message.get('tool_calls') and pieces:
                tc0 = message['tool_calls'][0]
                init_chunk = json.dumps(dict(base, choices=[dict(base['choices'][0], delta={
                    'tool_calls': [{'index': 0, 'id': tc0['id'], 'type': 'function',
                                    'function': {'name': tc0['function']['name'], 'arguments': ''}}]
                })]), ensure_ascii=False)
                self.wfile.write(f'data: {init_chunk}\n\n'.encode())
            for piece in pieces:
                delta = {'content': piece} if content else {
                    'tool_calls': [{'index': 0,
                                    'function': {'arguments': piece}}]}
                chunk = json.dumps(dict(base, choices=[dict(base['choices'][0], delta=delta)]),
                                   ensure_ascii=False)
                self.wfile.write(f'data: {chunk}\n\n'.encode())
                self.wfile.flush()
                if content and '慢速输出' in content:
                    time.sleep(0.05)
            done = dict(base, choices=[dict(base['choices'][0], delta={}, finish_reason='stop')])
            self.wfile.write(f"data: {json.dumps(done, ensure_ascii=False)}\n\n".encode())
            self.wfile.write(b'data: [DONE]\n\n')
        except (BrokenPipeError, ConnectionResetError):
            pass

    def _json(self, payload, code=200):
        data = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main():
    server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'FAKE-MODEL-READY port={server.server_address[1]}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    sys.exit(main())
