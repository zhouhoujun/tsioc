import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { agentUiChinese, agentUiEnglish } from '../src/agent-ui.i18n';
import { AgentConsoleSessionState, renderAgentConsoleMessageItems } from '../src';

function translateFrom(bundle: typeof agentUiEnglish) {
    return (key: string, params?: Record<string, any>) => {
        const parts = key.split('.');
        let current: any = bundle.messages;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return key;
            }
        }
        if (typeof current !== 'string') {
            return key;
        }
        return current.replace(/\{(\w+)\}/g, (_m, name: string) => String(params?.[name] ?? ''));
    };
}

const zh = { translate: translateFrom(agentUiChinese as any) } as any;
const en = { translate: translateFrom(agentUiEnglish as any) } as any;

function createState(): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.setConsoleOptions({ messagesVisibleItems: 5 });
    state.setTimelineMode('steps');
    return state;
}

function userMsg(id: string, createdAt: number): any {
    return { id, role: 'user', content: 'run the tests', createdAt };
}

function eventMsg(id: string, createdAt: number): any {
    return {
        id,
        role: 'assistant',
        content: 'tool content',
        createdAt,
        metadata: {
            uiKind: 'event',
            uiEventType: 'tool_completed',
            uiEventKey: `scope:tool:${id}`,
            status: 'success'
        }
    };
}

/**
 * Opencode-style rows keep UI chrome localized while payloads stay raw, and the
 * finished-turn footer must bill the work, not the idle time after it.
 */
@Suite('timeline rows stay quiet and localized (opencode parity)')
export class TimelineRowParityTest {
    @Test('tool result markers follow the locale')
    toolResultMarkerLocalized() {
        const message = {
            id: 'e1',
            role: 'assistant',
            content: '读取文件 · README.md (truncated)',
            createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success' }
        } as any;

        const zhItem = renderAgentConsoleMessageItems([message], { timelineMode: true, translator: zh })[0];
        const zhText = zhItem.lines.map(line => line.content || '').join('\n');
        expect(zhText).toContain('README.md（已截断）');
        expect(zhText).not.toContain('(truncated)');

        const enItem = renderAgentConsoleMessageItems([message], { timelineMode: true, translator: en })[0];
        const enText = enItem.lines.map(line => line.content || '').join('\n');
        expect(enText).toContain('(truncated)');
    }

    @Test('assistant prose keeps a literal truncated word')
    proseMarkerStaysRaw() {
        const item = renderAgentConsoleMessageItems([{
            id: 'a1',
            role: 'assistant',
            content: 'The model output ended with (truncated)',
            createdAt: 1
        } as any], { timelineMode: true, translator: zh })[0];
        const text = item.lines.map(line => line.content || '').join('\n');
        expect(text).toContain('(truncated)');
        expect(text).not.toContain('（已截断）');
    }

    @Test('finished footer does not bill the idle time after the turn')
    footerFreezesAtLastActivity() {
        const base = 1_000_000_000;
        const state = createState();
        state.setMessages([
            userMsg('u1', base - 60_000),
            eventMsg('e1', base - 2_000)
        ]);
        const realNow = Date.now;
        try {
            (Date as any).now = () => base;
            const first = state.sessionFooter!.content;
            (Date as any).now = () => base + 600_000;
            const later = state.sessionFooter!.content;
            expect(later).toEqual(first);
            expect(first).toContain('58.0s');
        } finally {
            (Date as any).now = realNow;
        }
    }

    @Test('running footer keeps counting until the turn ends')
    runningFooterStaysLive() {
        const base = 1_000_000_000;
        const state = createState();
        state.setMessages([
            userMsg('u1', base - 2_000),
            eventMsg('e1', base)
        ]);
        state.setStatus('running');
        const realNow = Date.now;
        try {
            (Date as any).now = () => base;
            const first = state.sessionFooter!.content;
            (Date as any).now = () => base + 5_000;
            const later = state.sessionFooter!.content;
            expect(first).not.toEqual(later);
            expect(first).toContain('2.0s');
            expect(later).toContain('7.0s');
        } finally {
            (Date as any).now = realNow;
        }
    }
}
