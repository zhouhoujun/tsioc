import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import type { AgentMessage } from '@tsdi/agent';
import {
    AgentConsoleTurnStreamHost,
    AgentConsoleTurnStreamState,
    consumeStreamChunkView
} from '../src/AgentConsoleTurnStreamController';

/**
 * Regression coverage for the narration/final-answer fusion defect.
 *
 * A single turn can contain many tool rounds, and the model narrates before each
 * one. Every text chunk of the whole turn was appended onto ONE assistant row, so
 * interim narrations fused into the final answer without a separator
 * (`...what exists.` + `domain.ts was summarized...` -> `exists.domain.ts`).
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
        // Mirrors AgentConsoleSessionState: both ui-event writers append at the tail.
        appendUiEventMessage: (content: string, options: any = {}) => {
            const text = String(content || '').trim();
            if (!text) {
                return;
            }
            const row = createUiEventRow(text, options);
            if (options.eventKey) {
                eventRows.set(options.eventKey, messages.length);
            }
            messages.push(row);
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
            const row = createUiEventRow(text, { ...options, eventKey });
            eventRows.set(eventKey, messages.length);
            messages.push(row);
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
    // Built as a variable (not a fresh literal) so this spec compiles against the
    // pre-fix shape as well, which keeps the regression red rather than a type error.
    const state = { streamMessageText: '', sealedNarrationCount: 0 };
    return state as AgentConsoleTurnStreamState;
}

/** Rows produced by streamed model text (tool/event rows carry metadata.uiKind). */
function textRows(host: AgentConsoleTurnStreamHost): string[] {
    return host.state.messages
        .filter(item => item.role === 'assistant' && !item.metadata?.uiKind)
        .map(item => String(item.content || ''));
}

function toolRows(host: AgentConsoleTurnStreamHost): AgentMessage[] {
    return host.state.messages.filter(item => item.metadata?.uiKind === 'event');
}

function toolCall(toolCallId: string, content: string): any {
    return { type: 'tool_call', toolCallId, toolName: 'inspect_directory', content };
}

/** Mirrors AgentConsoleTurnInputController: one assistant row per turn. */
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

@Suite('turn stream narration boundaries')
export class TurnStreamNarrationTest {

    @Test('keeps a single-round answer in one row (unchanged behaviour)')
    singleRound() {
        const host = createFakeHost();
        const state = newStreamState();
        const assistantMessage = startTurn(host);

        consumeStreamChunkView(host, state, { type: 'text', content: 'Hello.' }, assistantMessage);
        consumeStreamChunkView(host, state, { type: 'done', message: { content: 'Hello.' } }, assistantMessage);

        expect(textRows(host)).toEqual(['Hello.']);
        expect(toolRows(host).length).toBe(0);
        expect(host.state.messages[host.state.messages.length - 1].content).toBe('Hello.');
    }

    @Test('separates interim narration from the final answer around a tool call')
    multiRound() {
        const host = createFakeHost();
        const state = newStreamState();
        const assistantMessage = startTurn(host);

        consumeStreamChunkView(host, state, { type: 'text', content: 'Let me inspect the project.' }, assistantMessage);
        consumeStreamChunkView(host, state, toolCall('tc-1', 'Inspect directory'), assistantMessage);
        consumeStreamChunkView(host, state, { type: 'text', content: 'Now I understand the layout.' }, assistantMessage);
        consumeStreamChunkView(host, state, { type: 'done', message: { content: 'Now I understand the layout.' } }, assistantMessage);

        // Interim narration and final answer must not share a row.
        expect(textRows(host)).toEqual(['Let me inspect the project.', 'Now I understand the layout.']);
        expect(toolRows(host).length).toBe(1);

        // The exact artifact seen in the real transcript.
        const fused = host.state.messages.find(item => String(item.content || '').includes('project.Now'));
        expect(fused).toBeUndefined();

        // Stream order: narration -> tool row -> final answer last.
        expect(host.state.messages[host.state.messages.length - 1].content).toBe('Now I understand the layout.');
    }

    @Test('leaves no empty assistant row when a turn ends on a tool call')
    endsOnToolCall() {
        const host = createFakeHost();
        const state = newStreamState();
        const assistantMessage = startTurn(host);

        consumeStreamChunkView(host, state, { type: 'text', content: 'Checking the exam system.' }, assistantMessage);
        consumeStreamChunkView(host, state, toolCall('tc-1', 'Inspect directory'), assistantMessage);
        consumeStreamChunkView(host, state, { type: 'text', content: 'Also reading seed.ts.' }, assistantMessage);
        consumeStreamChunkView(host, state, toolCall('tc-2', 'Read seed.ts'), assistantMessage);
        consumeStreamChunkView(host, state, { type: 'done', message: { content: '' } }, assistantMessage);

        expect(textRows(host)).toEqual(['Checking the exam system.', 'Also reading seed.ts.']);
        expect(toolRows(host).length).toBe(2);
        // No empty bubble may survive the placeholder being fully sealed away.
        expect(host.state.messages.every(item => String(item.content || '').trim().length > 0)).toBe(true);
    }
}
