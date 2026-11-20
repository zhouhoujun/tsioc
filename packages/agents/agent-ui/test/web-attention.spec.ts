import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { JSDOM } from 'jsdom';
import { DefaultReactiveEffect, reactive } from '@tsdi/components';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src';
import { installAgentWebAttention } from '../web-console/notifications';

interface ShownNotification {
    title: string;
    body?: string;
    tag?: string;
}

function fakeNotification(permission: string, shown: ShownNotification[]) {
    return class FakeNotification {
        static permission = permission;
        static requestPermission = async () => permission;
        constructor(title: string, options?: { body?: string; tag?: string }) {
            shown.push({ title, body: options?.body, tag: options?.tag });
        }
        close(): void {
            // no-op
        }
    };
}

function documentWithVisibility(visibility: 'visible' | 'hidden'): Document {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3100/' });
    const doc = dom.window.document;
    Object.defineProperty(doc, 'visibilityState', { value: visibility, configurable: true });
    return doc;
}

async function flush(): Promise<void> {
    for (let index = 0; index < 8; index++) {
        await Promise.resolve();
    }
}

function stateFixture(): { raw: AgentConsoleSessionState; proxy: any; effect: DefaultReactiveEffect } {
    const raw = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    raw.configure({ sessionId: 'session-a' });
    raw.title = 'Alpha';
    const effect = new DefaultReactiveEffect();
    return { raw, proxy: reactive(raw, effect), effect };
}

@Suite('web attention notifications')
export class WebAttentionNotificationsTest {
    @Test('notifies approvals, questions and turn completion while the page is hidden')
    async notifiesHiddenEvents() {
        const doc = documentWithVisibility('hidden');
        const shown: ShownNotification[] = [];
        const { proxy, effect } = stateFixture();
        const dispose = installAgentWebAttention({
            document: doc,
            state: proxy,
            effect,
            notification: fakeNotification('granted', shown) as any
        });
        try {
            proxy.setStatus('running');
            await flush();
            proxy.setPendingApprovals([{ id: 'approval-1', toolName: 'terminal' } as any]);
            await flush();
            expect(shown.length).toEqual(1);
            expect(shown[0].body).toContain('terminal');
            expect(shown[0].tag).toEqual('tsdi-approval');

            proxy.setPendingQuestion({ questionId: 'q1', question: 'Proceed?' } as any);
            await flush();
            expect(shown.length).toEqual(2);
            expect(shown[1].body).toContain('Proceed?');

            proxy.setStatus('idle');
            await flush();
            expect(shown.length).toEqual(3);
            expect(shown[2].body).toContain('Alpha');
            expect(shown[2].tag).toEqual('tsdi-turn');
        } finally {
            dispose();
        }
    }

    @Test('stays silent while the page is visible')
    async silentWhenVisible() {
        const doc = documentWithVisibility('visible');
        const shown: ShownNotification[] = [];
        const { proxy, effect } = stateFixture();
        const dispose = installAgentWebAttention({
            document: doc,
            state: proxy,
            effect,
            notification: fakeNotification('granted', shown) as any
        });
        try {
            proxy.setPendingApprovals([{ id: 'a', toolName: 'bash' } as any]);
            await flush();
            expect(shown).toEqual([]);
        } finally {
            dispose();
        }
    }

    @Test('does nothing without notification permission')
    async silentWithoutPermission() {
        const doc = documentWithVisibility('hidden');
        const shown: ShownNotification[] = [];
        const { proxy, effect } = stateFixture();
        const dispose = installAgentWebAttention({
            document: doc,
            state: proxy,
            effect,
            notification: fakeNotification('denied', shown) as any
        });
        try {
            proxy.setPendingApprovals([{ id: 'a', toolName: 'bash' } as any]);
            await flush();
            expect(shown).toEqual([]);
        } finally {
            dispose();
        }
    }
}
