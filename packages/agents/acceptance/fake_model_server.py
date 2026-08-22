#!/usr/bin/env python3
"""Fake OpenAI-compatible chat server for PTY acceptance runs.

Scripted turn sequence (one entry per chat-completions request):
  1. long reply ending with a tail question          -> scenario 1 (tail visibility)
  2. tool_call  {todo: pending item}                 -> scenario 3 setup
  3. tool_call  {todo: same item completed}          -> scenario 3 checkbox flip
  4. short closing text                              -> scenario 3 settle

Env knobs:
  FAKE_PORT            port to bind (default: 0 = ephemeral, printed on ready line)
  FAKE_TODO_CONTENT    plan item label (default: 计划项 A)
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


def _turn(i):
    """Return the scripted assistant message dict for request number i (1-based)."""
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
