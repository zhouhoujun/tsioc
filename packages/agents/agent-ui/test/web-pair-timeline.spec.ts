/**
 * Browser `/web` (alias of `/pair`): the one-time link is command output, so
 * it belongs to the end of the transcript — not a modal card above the
 * composer. The terminal keeps its QR overlay (see `pair-overlay.spec.ts`).
 */
import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { JSDOM } from 'jsdom';
import { ComponentRef } from '@tsdi/components';
import { AgentConsoleComponent, AgentConsoleSessionState } from '../src';
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

@Suite('web /pair timeline output')
export class WebPairTimelineTest {
    dom!: JSDOM;

    @Before()
    setUpDom() {
        this.dom = new JSDOM('<!DOCTYPE html><html><body><div id="agent-console"></div></body></html>', {
            runScripts: 'dangerously',
            resources: 'usable',
            url: 'http://localhost:3100/'
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
    tearDownDom() {
        delete (globalThis as unknown as { document?: Document }).document;
        if (global.gc) global.gc();
    }

    @Test('/web appends the pairing links to the transcript instead of opening a dialog')
    async appendsPairingLinks() {
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
            mounted.state.pairAction = async () => ({
                urls: ['http://127.0.0.1:3100/?pair=abc', 'http://192.168.1.5:3100/?pair=abc'],
                expiresAt: Date.now() + 5 * 60_000
            });
            const ref = mounted.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
            expect(await (ref.instance as any).handleCommand('/web')).toEqual(true);
            await waitUntil(() => String(
                (this.dom.window.document.querySelector('#agent-console .console-messages-panel')?.textContent || '')
            ).includes('192.168.1.5'));
            const transcript = String(
                (this.dom.window.document.querySelector('#agent-console .console-messages-panel')?.textContent || '')
            );
            expect(transcript).toContain('127.0.0.1:3100/?pair=abc');
            // The browser has no scannable QR: no dialog/card may open for it.
            expect(mounted.state.textOverlay).toBeFalsy();
        } finally {
            await mounted.dispose();
            gateway.dispose();
        }
    }

    @Test('/settings opens the card popup in the browser and mounts it on the console root')
    async settingsOpensPopup() {
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
            const ref = mounted.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
            await (ref.instance as any).handleCommand('/settings');
            await waitUntil(() => !!this.dom.window.document.querySelector('#agent-console [data-settings-page]'));
            const page = this.dom.window.document.querySelector('#agent-console [data-settings-page]') as HTMLElement;
            expect(!!page).toEqual(true);
            expect(page.hasAttribute('hidden')).toEqual(false);
            // The page lives inside the themed console root so the popup skin
            // (and `.is-hidden`) applies.
            expect(!!page.closest('.agent-console')).toEqual(true);
            expect(mounted.state.settingsPageOpen).toEqual(true);
            expect(mounted.state.settingsCenterOpen).toEqual(false);
            // Esc in the composer dismisses the popup like any other modal.
            const composer = this.dom.window.document.querySelector('#agent-console textarea') as HTMLTextAreaElement;
            composer.dispatchEvent(new this.dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
            await waitUntil(() => mounted.state.settingsPageOpen === false);
            expect(page.hasAttribute('hidden')).toEqual(true);
        } finally {
            await mounted.dispose();
            gateway.dispose();
        }
    }
}
