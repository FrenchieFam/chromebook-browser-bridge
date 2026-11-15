#!/usr/bin/env python3
"""Authenticated local queue between a terminal client and a user-selected Chrome tab."""
import argparse, hmac, json, queue, secrets, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ACTIONS = {'focus', 'snapshot', 'screenshot', 'navigate', 'click', 'type', 'scroll', 'key', 'select', 'viewport'}
class State:
    def __init__(self, token):
        self.token = token
        self.jobs = queue.Queue(maxsize=20)
        self.pending = {}
        self.lock = threading.Lock()
        self.peer = {}
        self.seen = 0

class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(10)
    def log_message(self, *args): pass
    def origin_ok(self):
        origin = self.headers.get('Origin', '')
        return not origin or (origin.startswith('chrome-extension://') and len(origin.split('://')[-1]) == 32 and all(c in 'abcdefghijklmnop' for c in origin.split('://')[-1]))
    def authorized(self):
        return self.origin_ok() and hmac.compare_digest(self.headers.get('Authorization', '').encode(), ('Bearer ' + self.server.state.token).encode())
    def reply(self, code, payload):
        data = json.dumps(payload).encode()
        self.send_response(code)
        origin = self.headers.get('Origin', '')
        if self.origin_ok() and origin:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        # Chrome may use a private-network preflight for the VM endpoint.
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        try: self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError): pass
    def do_OPTIONS(self):
        self.reply(200 if self.origin_ok() else 403, {})
    def do_GET(self):
        if not self.authorized(): return self.reply(403, {'error': 'Unauthorized'})
        state = self.server.state
        if self.path == '/status':
            with state.lock:
                age = time.time() - state.seen if state.seen else None
                peer = dict(state.peer)
            return self.reply(200, {'connected': age is not None and age < 12 and peer.get('tabId') is not None, 'heartbeatAgeSeconds': round(age, 1) if age is not None else None, 'tab': peer})
        if self.path == '/poll':
            with state.lock: state.seen = time.time()
            while True:
                try: job = state.jobs.get_nowait()
                except queue.Empty: return self.reply(200, {'job': None})
                with state.lock:
                    if job['id'] not in state.pending or job['expires'] < time.time(): continue
                return self.reply(200, {'job': job})
        return self.reply(404, {'error': 'Unknown route'})
    def do_POST(self):
        if not self.authorized(): return self.reply(403, {'error': 'Unauthorized'})
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 16_000_000: raise ValueError('Invalid body size')
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict): raise ValueError('Expected JSON object')
        except (ValueError, UnicodeError): return self.reply(400, {'error': 'Invalid JSON object or body size'})
        state = self.server.state
        if self.path == '/heartbeat':
            if body.get('tabId') is not None and (type(body['tabId']) is not int or body['tabId'] < 0):
                return self.reply(400, {'error': 'Invalid tab ID'})
            with state.lock:
                if body.get('tabId') != state.peer.get('tabId'):
                    for pending in state.pending.values():
                        pending['result'] = {'ok': False, 'error': 'Connection changed; inspect a fresh snapshot'}
                        pending['event'].set()
                    state.pending.clear()
                state.seen = time.time()
                state.peer = {k: body.get(k) for k in ('tabId', 'title', 'url', 'extensionVersion', 'lastError', 'detachReason', 'wake')}
            return self.reply(200, {'ok': True})
        if self.path == '/result':
            if not isinstance(body.get('id'), str):
                return self.reply(400, {'error': 'Invalid result ID'})
            with state.lock:
                pending = state.pending.get(body.get('id'))
                if pending:
                    pending['result'] = body.get('result')
                    pending['event'].set()
            return self.reply(200, {'accepted': pending is not None})
        if self.path != '/command': return self.reply(404, {'error': 'Unknown route'})
        if not isinstance(body.get('action'), str) or body.get('action') not in ACTIONS or not isinstance(body.get('args', {}), dict):
            return self.reply(400, {'error': 'Unsupported action or invalid arguments'})
        if len(json.dumps(body)) > 100_000: return self.reply(400, {'error': 'Command too large'})
        with state.lock:
            if time.time() - state.seen > 12 or state.peer.get('tabId') is None:
                return self.reply(409, {'error': 'No selected Chrome tab connected. Open the extension and connect a tab.'})
            job = {'id': secrets.token_hex(12), 'action': body['action'], 'args': body.get('args', {}), 'expires': time.time() + 40}
            pending = {'event': threading.Event(), 'result': None}
            state.pending[job['id']] = pending
        try: state.jobs.put_nowait(job)
        except queue.Full:
            with state.lock: state.pending.pop(job['id'], None)
            return self.reply(429, {'error': 'Queue full'})
        done = pending['event'].wait(40)
        with state.lock: state.pending.pop(job['id'], None)
        self.reply(200 if done else 504, pending['result'] if done else {'error': 'Timed out; action may have happened. Inspect before retrying.'})

class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    def __init__(self, address, state):
        self.state = state
        super().__init__(address, Handler)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--host', default='0.0.0.0')
    p.add_argument('--port', type=int, default=8765)
    p.add_argument('--token-file', type=Path, default=Path.home()/'.config/chromebook-browser-bridge/token')
    args = p.parse_args()
    token = args.token_file.read_text().strip()
    if len(token) < 40: raise SystemExit('Bridge token missing or too short')
    server = Server((args.host, args.port), State(token))
    print('Browser bridge listening on port', args.port, flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__ == '__main__': main()
