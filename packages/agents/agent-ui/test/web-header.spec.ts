import * as fs from 'fs';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { JSDOM } from 'jsdom';

const HEADER_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'web', 'header.js'), 'utf8');
const PAGE_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8')
    .replace('<script src="./header.js"></script>', '');

async function waitFor(check: () => boolean, timeoutMs = 3000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (check()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error('timed out waiting for the web header');
}

@Suite('web console session header')
export class WebConsoleHeaderTest {
    @Test('redeems the pairing code, lists sessions newest-first and creates a new session')
    async headerFlow() {
        const dom = new JSDOM(PAGE_SOURCE, {
            url: 'http://127.0.0.1:3100/?pair=abc&session=chat-1',
            runScripts: 'outside-only'
        });
        const { window } = dom;
        const calls: Array<{ url: string; method?: string }> = [];
        (window as any).fetch = async (url: string, init: any) => {
            const target = String(url);
            if (target.endsWith('/api/pair')) {
                calls.push({ url: target });
                return { ok: true, json: async () => ({ token: 'secret' }) };
            }
            const body = JSON.parse(String(init?.body || '{}'));
            calls.push({ url: target, method: body.method });
            if (body.method === 'session.list') {
                return {
                    ok: true,
                    json: async () => ({
                        result: [
                            { id: 'chat-2', title: 'Older task', lastActiveAt: Date.now() - 3600_000 },
                            { id: 'chat-1', title: 'Newest task', lastActiveAt: Date.now() - 60_000 }
                        ]
                    })
                };
            }
            if (body.method === 'session.create') {
                return { ok: true, json: async () => ({ result: { sessionId: 'chat-new' } }) };
            }
            return { ok: true, json: async () => ({ result: null }) };
        };

        try {
            window.eval(HEADER_SOURCE);
            await waitFor(() => window.document.querySelectorAll('#agent-session-select option').length === 2);

            const options = Array.from(window.document.querySelectorAll('#agent-session-select option')) as any[];
            expect(options.map(option => option.value)).toEqual(['chat-1', 'chat-2']);
            expect(options[0].textContent).toContain('Newest task');
            expect(options[0].textContent).toContain('1m');
            expect((window as any).__TSDI_AGENT_WEB__.token).toEqual('secret');
            expect((window as any).__TSDI_AGENT_WEB__.sessionId).toEqual('chat-1');
            expect(window.location.search).not.toContain('pair=');
            expect(window.document.getElementById('agent-header-status')?.textContent).toContain('2 sessions');
            expect(calls.some(call => call.method === 'session.list')).toEqual(true);

            const addButton = window.document.getElementById('agent-session-new') as any;
            addButton.dispatchEvent(new window.Event('click'));
            await waitFor(() => calls.some(call => call.method === 'session.create'));
            expect(calls.some(call => call.method === 'session.create')).toEqual(true);

            const header = (window as any).__TSDI_AGENT_WEB_HEADER__;
            expect(header.sessionUrl('chat-2')).toEqual('/?session=chat-2');
            expect(header.formatAge(Date.now() - 50 * 3600_000)).toEqual('2d');
        } finally {
            window.close();
        }
    }

    @Test('an empty server gets a session created before the console mounts')
    async emptyServerCreatesSession() {
        const dom = new JSDOM(PAGE_SOURCE, {
            url: 'http://127.0.0.1:3100/',
            runScripts: 'outside-only'
        });
        const { window } = dom;
        const calls: string[] = [];
        (window as any).fetch = async (url: string, init: any) => {
            const target = String(url);
            if (target.endsWith('/api/pair')) {
                return { ok: true, json: async () => ({ token: '' }) };
            }
            const body = JSON.parse(String(init?.body || '{}'));
            calls.push(body.method);
            if (body.method === 'session.list') {
                return { ok: true, json: async () => ({ result: [] }) };
            }
            if (body.method === 'session.create') {
                return { ok: true, json: async () => ({ result: { sessionId: 'chat-first' } }) };
            }
            return { ok: true, json: async () => ({ result: null }) };
        };
        try {
            window.eval(HEADER_SOURCE);
            await waitFor(() => calls.includes('session.create'));
            const options = Array.from(window.document.querySelectorAll('#agent-session-select option')) as any[];
            expect(options.map(option => option.value)).toEqual(['chat-first']);
            expect((window as any).__TSDI_AGENT_WEB__.sessionId).toEqual('chat-first');
            expect(calls.filter(method => method === 'session.create').length).toEqual(1);
        } finally {
            window.close();
        }
    }
}
