#!/usr/bin/env python3
"""Fake OpenAI-compatible chat server for PTY acceptance runs.

Scripted turn sequences, selected by FAKE_SCENARIO:

  default (tail/todo, P200):
    1. long reply ending with a tail question          -> scenario 1 (tail visibility)
    2. tool_call  {todo: pending item}                 -> scenario 3 setup
    3. tool_call  {todo: same item completed}          -> scenario 3 checkbox flip
    4. short closing text                              -> scenario 3 settle

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
Stdout line "FAKE-MODEL-READY port=<port>" signals readiness.
Stdlib only; no external dependencies.
"""
import json
import os
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get('FAKE_PORT', '0'))
TODO_CONTENT = os.environ.get('FAKE_TODO_CONTENT', '计划项 A')
SCENARIO = os.environ.get('FAKE_SCENARIO', 'default')

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


def _turn(i):
    """Return the scripted assistant message dict for request number i (1-based)."""
    if SCENARIO == 'plan-lifecycle':
        return _plan_turn(i)
    if i == 1:
        lines = [f'第 {n} 行：这是用于撑满视口的长回复内容，验证滚动后尾部问询仍然可见。'
                 for n in range(1, 121)]
        return {'role': 'assistant', 'content': '\n'.join(lines) + '\n\n是否继续？'}
    if i == 2:
        return {
            'role': 'assistant',
            'content': None,
            'tool_calls': [{
                'id': 'call_acc_1',
                'type': 'function',
                'function': {
                    'name': 'todo',
                    'arguments': json.dumps(
                        {'todos': [{'id': 'acc-1', 'content': TODO_CONTENT, 'status': 'pending'}]},
                        ensure_ascii=False),
                },
            }],
        }
    if i == 3:
        return {
            'role': 'assistant',
            'content': None,
            'tool_calls': [{
                'id': 'call_acc_2',
                'type': 'function',
                'function': {
                    'name': 'todo',
                    'arguments': json.dumps(
                        {'todos': [{'id': 'acc-1', 'content': TODO_CONTENT, 'status': 'completed'}]},
                        ensure_ascii=False),
                },
            }],
        }
    return {'role': 'assistant', 'content': '计划已全部完成。'}


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
        message = _turn(Handler.request_count)
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
            base['choices'][0]['delta'] = {
                'tool_calls': [{'index': 0, 'id': message['tool_calls'][0]['id'],
                                'type': 'function',
                                'function': {'name': message['tool_calls'][0]['function']['name'],
                                             'arguments': ''}}]
            }
        try:
            if content:
                chunk = json.dumps(dict(base, choices=[dict(base['choices'][0], delta={'role': 'assistant'})]),
                                   ensure_ascii=False)
                self.wfile.write(f'data: {chunk}\n\n'.encode())
            for piece in pieces:
                delta = {'content': piece} if content else {
                    'tool_calls': [{'index': 0,
                                    'function': {'arguments': piece}}]}
                chunk = json.dumps(dict(base, choices=[dict(base['choices'][0], delta=delta)]),
                                   ensure_ascii=False)
                self.wfile.write(f'data: {chunk}\n\n'.encode())
                self.wfile.flush()
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
