import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';

/**
 * Real TUI finding: a 200-line command output was unreachable — the event
 * inspector only showed the event's one-line summary because the loaded
 * transcript drops `role='tool'` payload messages. The inspector now asks the
 * host for the payload by toolCallId on demand.
 */
@Suite('event inspector loads the tool payload on demand')
export class EventInspectorOutputTest {
    protected eventMessage(id = 'evt-1', toolCallId = 'call-1'): any {
        return {
            id,
            role: 'assistant',
            content: 'Run command completed · node -e ... · exit 0 · 200 lines',
            createdAt: 10,
            metadata: {
                uiKind: 'event',
                uiEventType: 'tool_completed',
                status: 'success',
                timeline: { toolCallId, receiptId: 'r1', source: 'local' }
            }
        };
    }

    @Test('opening the inspector shows the raw output fetched by toolCallId')
    async inspectorShowsFetchedOutput() {
        const state = new AgentConsoleSessionState();
        const requested: string[] = [];
        (state as any).toolPayloadLoader = async (toolCallId: string) => {
            requested.push(toolCallId);
            return ['line 1', 'line 2', 'line 3'].join('\n');
        };
        const event = this.eventMessage();
        state.setMessages([event]);
        state.setSelectedMessageId('evt-1');
        state.openTimelineEventInspector();
        for (let index = 0; index < 8; index++) {
            await Promise.resolve();
        }
        expect(requested).toEqual(['call-1']);
        const lines = state.timelineEventDetailLines.join('\n');
        expect(lines).toContain('line 3');
        expect(lines).toContain('Raw output');
    }

    @Test('a failed or empty payload keeps the inspector usable')
    async inspectorWithoutPayload() {
        const state = new AgentConsoleSessionState();
        (state as any).toolPayloadLoader = async () => '';
        state.setMessages([this.eventMessage()]);
        state.setSelectedMessageId('evt-1');
        state.openTimelineEventInspector();
        for (let index = 0; index < 8; index++) {
            await Promise.resolve();
        }
        const lines = state.timelineEventDetailLines.join('\n');
        expect(lines).toContain('tool_completed');
        expect(lines).not.toContain('Raw output');
    }
}

/** Enter on a selected timeline event row must open the inspector (real key path). */
@Suite('enter opens the event inspector for tool rows')
export class EventInspectorEnterTest {
    @Test('handleMessageListKey("enter") opens the inspector')
    async enterOpensInspector() {
        const state = new AgentConsoleSessionState();
        const event: any = {
            id: 'evt-1',
            role: 'assistant',
            content: 'Run command completed · exit 0 · 200 lines',
            createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success', timeline: { toolCallId: 'call-1' } }
        };
        state.setMessages([event]);
        (state as any).setMessagesFocused(true);
        state.setSelectedMessageId('evt-1');
        const navigation: any = { move: () => undefined, movePage: () => undefined, selectFirst: () => undefined, selectLast: () => undefined, setFocused: () => undefined };
        const handled = await (state as any).focusLayers.handleMessageListKey('enter', navigation);
        expect(handled).toEqual(true);
        expect((state as any).timelineEventInspectorOpen).toEqual(true);
    }
}

/** The decoded terminal path must open the inspector too. */
@Suite('decoded return key opens the event inspector')
export class EventInspectorDecodedKeyTest {
    @Test('processDecodedInput(return) on a focused event row opens the inspector')
    async decodedReturnOpensInspector() {
        const state = new AgentConsoleSessionState();
        state.setMessages([{
            id: 'evt-1',
            role: 'assistant',
            content: 'Run command completed · exit 0 · 200 lines',
            createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success', timeline: { toolCallId: 'call-1' } }
        } as any]);
        state.setSelectedMessageId('evt-1');
        (state as any).setMessagesFocused(true);
        const navigation: any = { move: () => undefined, movePage: () => undefined, selectFirst: () => undefined, selectLast: () => undefined, setFocused: () => undefined };
        const result: any = await (state as any).processDecodedInput(
            { text: '', controlKey: 'return', partial: false },
            '',
            {
                isClosed: false,
                onExit: () => undefined,
                hasActiveTextPrompt: false,
                transcriptNavigationController: navigation
            }
        );
        expect(result.handled).toEqual(true);
        expect((state as any).timelineEventInspectorOpen).toEqual(true);
    }
}

/**
 * Real TUI finding: the terminal delivers Enter as `text: "\r"` with no
 * `controlKey`, so `resolveShortcutKey` normalized it to '' and dropped it —
 * `enter open` in the transcript hint did nothing (no detail, no inspector).
 */
@Suite('raw carriage return counts as enter in focus layers')
export class RawReturnShortcutTest {
    @Test('resolveShortcutKey maps a raw CR/LF to enter')
    async rawReturnMapsToEnter() {
        const state = new AgentConsoleSessionState();
        expect((state as any).focusLayers.resolveShortcutKey('\r', undefined)).toEqual('enter');
        expect((state as any).focusLayers.resolveShortcutKey('\n', undefined)).toEqual('enter');
    }

    @Test('a decoded CR opens the event inspector')
    async decodedRawReturnOpensInspector() {
        const state = new AgentConsoleSessionState();
        state.setMessages([{
            id: 'evt-1',
            role: 'assistant',
            content: 'Run command completed · exit 0 · 200 lines',
            createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success', timeline: { toolCallId: 'call-1' } }
        } as any]);
        state.setSelectedMessageId('evt-1');
        (state as any).setMessagesFocused(true);
        const navigation: any = { move: () => undefined, movePage: () => undefined, selectFirst: () => undefined, selectLast: () => undefined, setFocused: () => undefined };
        const result: any = await (state as any).processDecodedInput(
            { text: '\r', partial: false },
            '',
            { isClosed: false, onExit: () => undefined, hasActiveTextPrompt: false, transcriptNavigationController: navigation }
        );
        expect(result.handled).toEqual(true);
        expect((state as any).timelineEventInspectorOpen).toEqual(true);
    }
}
