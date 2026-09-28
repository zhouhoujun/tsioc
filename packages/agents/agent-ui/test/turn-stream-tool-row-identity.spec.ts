import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import type { AgentMessage } from '@tsdi/agent';
import {
    AgentConsoleTurnStreamHost,
    AgentConsoleTurnStreamState,
    consumeStreamChunkView
} from '../src/AgentConsoleTurnStreamController';

/**
 * Regression coverage for per-invocation tool row identity.
 *
 * A streamed `tool_call` chunk carries one entry per invocation in `toolCalls`,
 * and each entry's `id` is the same provider-assigned identity the runtime puts
 * into `receipt.toolCallId`. The pending row therefore has to key on
 * `toolCalls[i].id`, otherwise:
 *   - every invocation of the same tool collapses onto `tool:<toolName>`, so the
 *     surviving row shows only the LAST invocation's argument (the real
 *     transcript showed `README.md` for a turn that had read source files), and
 *   - the pending row can never merge in place with its `tool_completed` event,
 *     which keys on `tool:<toolCallId>`.
 */
function createFakeHost(): AgentConsoleTurnStreamHost {
    const messages: AgentMessage[] = [];
    const eventRows = new Map<string, number>();

    const createUiEventRow = (content: string, options: any = {}): AgentMessage => ({
        id: `ui-event-${eventRows.size + 1}`,
        role: 'assistant',
        content,
        createdAt: Date.now(),
        metadata: {
            uiKind: 'event',
            uiEventType: options.eventType || 'state',
            uiEventLabel: options.label || 'state',
            uiEventKey: options.eventKey,
            status: options.status || 'running'
        }
    });

    const state: any = {
        sessionId: 'session-1',
        status: 'running',
        messages,
        setMessages: (next: AgentMessage[]) => {
            messages.length = 0;
            messages.push(...next);
        },
        setTokenUsage: () => undefined,
        setStatus: () => undefined,
        setContextPreparation: () => undefined,
        pushActivity: () => undefined,
        summarize: (value: string) => String(value || '').slice(0, 40),
        qualifyUiEventKey: (key: string) => key,
        appendUiEventMessage: (content: string, options: any = {}) => {
            const text = String(content || '').trim();
            if (!text) {
                return;
            }
            if (options.eventKey) {
                eventRows.set(options.eventKey, messages.length);
            }
            messages.push(createUiEventRow(text, options));
        },
        upsertUiEventMessage: (eventKey: string, content: string, options: any = {}) => {
            const text = String(content || '').trim();
            if (!text) {
                return;
            }
            const existingIndex = eventRows.get(eventKey);
            if (existingIndex != null && existingIndex < messages.length) {
                messages[existingIndex] = createUiEventRow(text, { ...options, eventKey });
                return;
            }
            eventRows.set(eventKey, messages.length);
            messages.push(createUiEventRow(text, { ...options, eventKey }));
        },
        upsertPendingApproval: () => undefined,
        requestApprovalAttention: () => undefined
    };

    return {
        state,
        destroyed: false,
        updateTerminalTitle: () => undefined,
        refreshTodoPlan: async () => undefined,
        refreshPendingApprovals: async () => undefined,
        appRpc: null,
        runtime: {} as any,
        executeTurn: async () => undefined
    } as unknown as AgentConsoleTurnStreamHost;
}

function newStreamState(): AgentConsoleTurnStreamState {
    const state = { streamMessageText: '', sealedNarrationCount: 0 };
    return state as AgentConsoleTurnStreamState;
}

function startTurn(host: AgentConsoleTurnStreamHost): AgentMessage {
    const assistantMessage: AgentMessage = {
        id: 'assistant-1',
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        metadata: { streaming: true }
    };
    host.state.setMessages([
        { id: 'user-1', role: 'user', content: 'Build the exam system.', createdAt: Date.now() },
        assistantMessage
    ]);
    return assistantMessage;
}

function toolRows(host: AgentConsoleTurnStreamHost): AgentMessage[] {
    return host.state.messages.filter(item => item.metadata?.uiKind === 'event');
}

function rowKeys(host: AgentConsoleTurnStreamHost): string[] {
    return toolRows(host).map(item => String(item.metadata?.uiEventKey || ''));
}

function readFileCall(id: string, filePath: string): any {
    return { id, name: 'read_file', input: { path: filePath } };
}

@Suite('turn stream per-invocation tool row identity')
export class TurnStreamToolRowIdentityTest {

    @Test('gives each invocation in one chunk its own keyed row')
    distinctRowsPerInvocation() {
        const host = createFakeHost();
        const state = newStreamState();
        const assistantMessage = startTurn(host);

        consumeStreamChunkView(host, state, {
            type: 'tool_call',
            content: '',
            toolCalls: [
                readFileCall('call-a', 'exam-system/src/seed.ts'),
                readFileCall('call-b', 'exam-system/README.md')
            ]
        }, assistantMessage);

        const rows = toolRows(host);
        expect(rows.length).toBe(2);

        // Each row keeps its own invocation identity, not a shared tool-name key.
        const keys = rowKeys(host);
        expect(keys.some(key => key.includes('call-a'))).toBe(true);
        expect(keys.some(key => key.includes('call-b'))).toBe(true);

        // The row for call-a must still name the file it actually read.
        const callA = rows.find(row => String(row.metadata?.uiEventKey || '').includes('call-a'));
        expect(String(callA?.content || '')).toContain('exam-system/src/seed.ts');
        const callB = rows.find(row => String(row.metadata?.uiEventKey || '').includes('call-b'));
        expect(String(callB?.content || '')).toContain('exam-system/README.md');
    }

    @Test('merges a completion into its own pending row instead of appending')
    completionMergesInPlace() {
        const host = createFakeHost();
        const state = newStreamState();
        const assistantMessage = startTurn(host);

        consumeStreamChunkView(host, state, {
            type: 'tool_call',
            content: '',
            toolCalls: [
                readFileCall('call-a', 'exam-system/src/seed.ts'),
                readFileCall('call-b', 'exam-system/README.md')
            ]
        }, assistantMessage);
        expect(toolRows(host).length).toBe(2);

        consumeStreamChunkView(host, state, {
            type: 'event',
            eventType: 'tool_completed',
            toolName: 'read_file',
            toolCallId: 'call-a',
            // Shape produced by AppRpcServer.describeToolCompletedEvent: `<toolName> · <outputSummary>`.
            content: 'read_file · exam-system/src/seed.ts',
            status: 'success'
        }, assistantMessage);

        // In-place merge: still two rows, no duplicate.
        const rows = toolRows(host);
        expect(rows.length).toBe(2);

        const callA = rows.find(row => String(row.metadata?.uiEventKey || '').includes('call-a'));
        expect(callA?.metadata?.uiEventType).toBe('tool_completed');
        expect(callA?.metadata?.status).toBe('success');
        // The merged row must still say which file, not degrade to a bare "read file completed".
        expect(String(callA?.content || '')).toContain('exam-system/src/seed.ts');

        // The sibling invocation stays pending and untouched.
        const callB = rows.find(row => String(row.metadata?.uiEventKey || '').includes('call-b'));
        expect(callB?.metadata?.uiEventType).toBe('tool_call');
        expect(callB?.metadata?.status).toBe('running');
    }

    @Test('keeps single-call chunks keyed by their top-level toolCallId')
    preservesTopLevelToolCallId() {
        const host = createFakeHost();
        const state = newStreamState();
        const assistantMessage = startTurn(host);

        consumeStreamChunkView(host, state, {
            type: 'tool_call',
            toolCallId: 'tc-1',
            toolName: 'inspect_directory',
            content: 'Inspect directory'
        }, assistantMessage);

        const rows = toolRows(host);
        expect(rows.length).toBe(1);
        expect(String(rows[0].metadata?.uiEventKey || '')).toContain('tc-1');
    }
}
