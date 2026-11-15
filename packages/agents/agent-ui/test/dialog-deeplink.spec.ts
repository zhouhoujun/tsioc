/**
 * `?dialog=<route>` deep links: the browser must open the same dialog the
 * terminal `/dialog <route>` command opens, and must not invent a dialog for
 * an unknown route.
 */
import expect = require('expect');
import { Suite, Test, Before, After } from '@tsdi/unit';
import { JSDOM } from 'jsdom';

import { AgentConsoleSessionState } from '../src';
import { openTextOverlay } from '../src/AgentConsoleOverlayState';
import { mountAgentWebConsole } from '../web-console';
import { FakeAgentGateway } from '../harness/FakeAgentGateway';

async function waitUntil(predicate: () => boolean, timeoutMs = 8000, intervalMs = 25): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        if (predicate()) {
            return;
        }
        if (Date.now() >= deadline) {
            throw new Error(`waitUntil timed out after ${timeoutMs}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
}

@Suite('dialog deep links (web)')
export class DialogDeepLinkTest {
    dom!: JSDOM;

    @Before()
    async setupDom() {
        this.dom = new JSDOM('<!DOCTYPE html><html><body><div id="agent-console"></div></body></html>', {
            runScripts: 'dangerously',
            resources: 'usable',
            url: 'http://localhost:3100/?dialog=help'
        });
        (this.dom.window as unknown as { process: unknown }).process = {
            env: {},
            cwd: () => '/',
            platform: 'browser',
            version: '',
            versions: {},
            nextTick: (fn: () => void) => setTimeout(fn, 0),
            on: () => undefined,
            argv: []
        };
        (globalThis as unknown as { document: Document }).document = this.dom.window.document;
    }

    @After()
    async teardownDom() {
        delete (globalThis as unknown as { document?: Document }).document;
        if (global.gc) global.gc();
    }

    @Test('?dialog=help opens the help route and not the /dialog wrapper')
    async deepLinkOpensRoute() {
        const gateway = new FakeAgentGateway({ sessionId: 'session-A' });
        const state = new AgentConsoleSessionState();
        const mountedPromise = mountAgentWebConsole({
            baseUrl: gateway.clientBaseUrl,
            sessionId: 'session-A',
            fetchImpl: gateway.createFetchImpl(),
            mount: this.dom.window.document.getElementById('agent-console') as HTMLElement,
            state,
            pwa: false,
            workspace: '',
            dialog: 'help'
        });
        try {
            await waitUntil(() => !!this.dom.window.document.querySelector('#agent-console .select-list'));
            const dialog = this.dom.window.document.querySelector('#agent-console .select-list') as HTMLElement;
            expect(!!dialog).toBe(true);
            expect(dialog.textContent || '').toContain('Help');
            expect(this.dom.window.document.querySelectorAll('#agent-console .select-option').length).toBeGreaterThan(2);
            const transcript = this.dom.window.document.querySelector('#agent-console .console-messages-panel')?.textContent || '';
            expect(transcript).toContain('/help');
            expect(transcript).not.toContain('/dialog');
            // Desktop focus lands on the composer so the deep-linked dialog is
            // immediately keyboard-operable.
            expect(this.dom.window.document.activeElement?.tagName).toEqual('TEXTAREA');
        } finally {
            gateway.dispose();
            const mounted = await mountedPromise.catch(() => null);
            if (mounted) {
                await mounted.dispose();
            }
        }
    }

    @Test('the wheel scrolls an open text dialog instead of the transcript')
    async wheelScrollsTextDialog() {
        const gateway = new FakeAgentGateway({ sessionId: 'session-A' });
        const mounted = await mountAgentWebConsole({
            baseUrl: gateway.clientBaseUrl,
            sessionId: 'session-A',
            fetchImpl: gateway.createFetchImpl(),
            mount: this.dom.window.document.getElementById('agent-console') as HTMLElement,
            state: new AgentConsoleSessionState(),
            pwa: false,
            workspace: ''
        });
        try {
            openTextOverlay(mounted.state, 'Routes', Array.from({ length: 40 }, (_value, index) => `line ${index + 1}`), 10);
            const mount = this.dom.window.document.getElementById('agent-console') as HTMLElement;
            await waitUntil(() => !!this.dom.window.document.querySelector('#agent-console .dialog-line'));
            mount.dispatchEvent(new this.dom.window.WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
            await waitUntil(() => (mounted.state.textOverlay?.scroll || 0) > 0);
            expect(mounted.state.textOverlay?.scroll).toEqual(1);
            mount.dispatchEvent(new this.dom.window.WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true }));
            await waitUntil(() => mounted.state.textOverlay?.scroll === 0);
            expect(mounted.state.textOverlay?.scroll).toEqual(0);
        } finally {
            await mounted.dispose();
            gateway.dispose();
        }
    }

    @Test('escape from a web text dialog restores its parent dialog')
    async escapeRestoresParent() {
        const gateway = new FakeAgentGateway({ sessionId: 'session-A' });
        const mounted = await mountAgentWebConsole({
            baseUrl: gateway.clientBaseUrl,
            sessionId: 'session-A',
            fetchImpl: gateway.createFetchImpl(),
            mount: this.dom.window.document.getElementById('agent-console') as HTMLElement,
            state: new AgentConsoleSessionState(),
            pwa: false,
            workspace: ''
        });
        try {
            let restored = 0;
            openTextOverlay(mounted.state, 'Help · Core', ['/help'], 10, () => { restored += 1; });
            await waitUntil(() => !!this.dom.window.document.querySelector('#agent-console .dialog-line'));
            const area = this.dom.window.document.querySelector('textarea.agent-input') as HTMLTextAreaElement;
            area.dispatchEvent(new this.dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
            await waitUntil(() => restored > 0);
            expect(restored).toEqual(1);
            expect(mounted.state.textOverlay).toEqual(null);
        } finally {
            await mounted.dispose();
            gateway.dispose();
        }
    }

    @Test('?dialog=<unknown> reports a toast instead of opening an empty dialog')
    async deepLinkUnknownRoute() {
        const gateway = new FakeAgentGateway({ sessionId: 'session-A' });
        const state = new AgentConsoleSessionState();
        const mountedPromise = mountAgentWebConsole({
            baseUrl: gateway.clientBaseUrl,
            sessionId: 'session-A',
            fetchImpl: gateway.createFetchImpl(),
            mount: this.dom.window.document.getElementById('agent-console') as HTMLElement,
            state,
            pwa: false,
            workspace: '',
            dialog: 'definitely-not-a-route'
        });
        try {
            await waitUntil(() => !!this.dom.window.document.querySelector('#agent-console .console-toast'));
            const toast = this.dom.window.document.querySelector('#agent-console .console-toast')?.textContent || '';
            expect(toast).toContain('definitely-not-a-route');
            // The template always renders an empty select shell; a real dialog
            // would have selectable rows in it.
            expect(this.dom.window.document.querySelectorAll('#agent-console .select-option').length).toEqual(0);
        } finally {
            gateway.dispose();
            const mounted = await mountedPromise.catch(() => null);
            if (mounted) {
                await mounted.dispose();
            }
        }
    }
}
