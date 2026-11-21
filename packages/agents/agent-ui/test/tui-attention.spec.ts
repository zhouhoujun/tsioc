import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DefaultReactiveEffect, reactive } from '@tsdi/components';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src';
import { installAgentConsoleTuiAttention } from '../console/attention';

async function flush(): Promise<void> {
    for (let index = 0; index < 8; index++) {
        await Promise.resolve();
    }
}

function stateFixture(): { proxy: any; effect: DefaultReactiveEffect } {
    const raw = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    raw.configure({ sessionId: 'session-a' });
    raw.title = 'Alpha';
    const effect = new DefaultReactiveEffect();
    return { proxy: reactive(raw, effect), effect };
}

/**
 * P2 opencode parity: the TUI had no OS notification path even though the
 * config already exposed `attention.notifications`. The notifier reads the
 * reactive state inside the shared effect — no subscription, no polling.
 */
@Suite('TUI attention notifications')
export class TuiAttentionNotificationsTest {
    @Test('notifies approvals, questions and turn completion')
    async notifiesEvents() {
        const shown: Array<{ title: string; body: string }> = [];
        const { proxy, effect } = stateFixture();
        const dispose = installAgentConsoleTuiAttention({
            state: proxy,
            effect,
            notifications: true,
            notify: (title, body) => shown.push({ title, body })
        });
        try {
            proxy.setStatus('running');
            await flush();
            proxy.setPendingApprovals([{ id: 'approval-1', toolName: 'terminal' } as any]);
            await flush();
            expect(shown.length).toEqual(1);
            expect(shown[0].title).toEqual('TSDI Agent');
            expect(shown[0].body).toContain('terminal');

            proxy.setPendingQuestion({ questionId: 'q1', question: 'Proceed?' } as any);
            await flush();
            expect(shown.length).toEqual(2);
            expect(shown[1].body).toContain('Proceed?');

            proxy.setStatus('idle');
            await flush();
            expect(shown.length).toEqual(3);
            expect(shown[2].body).toContain('Alpha');
        } finally {
            dispose();
        }
    }

    @Test('rings the bell only when attention sounds are enabled')
    async bellOnly() {
        const shown: string[] = [];
        let bells = 0;
        const { proxy, effect } = stateFixture();
        const dispose = installAgentConsoleTuiAttention({
            state: proxy,
            effect,
            notifications: false,
            sound: true,
            notify: (title, body) => shown.push(`${title}:${body}`),
            bell: () => { bells += 1; }
        });
        try {
            proxy.setStatus('running');
            await flush();
            proxy.setPendingApprovals([{ id: 'a', toolName: 'bash' } as any]);
            await flush();
            expect(shown).toEqual([]);
            expect(bells).toEqual(1);
        } finally {
            dispose();
        }
    }

    @Test('installs nothing when both channels are disabled')
    async disabled() {
        const { proxy, effect } = stateFixture();
        const dispose = installAgentConsoleTuiAttention({
            state: proxy,
            effect,
            notify: () => { throw new Error('must not notify'); },
            bell: () => { throw new Error('must not ring'); }
        });
        proxy.setStatus('running');
        await flush();
        proxy.setStatus('idle');
        await flush();
        dispose();
    }

    @Test('a disposed notifier stops firing')
    async disposed() {
        const shown: string[] = [];
        const { proxy, effect } = stateFixture();
        const dispose = installAgentConsoleTuiAttention({
            state: proxy,
            effect,
            notifications: true,
            notify: (_title, body) => shown.push(body)
        });
        dispose();
        proxy.setStatus('running');
        await flush();
        proxy.setStatus('idle');
        await flush();
        expect(shown).toEqual([]);
    }
}
