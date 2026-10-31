import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState, renderAgentConsoleMessageItems } from '../src';

function state(): AgentConsoleSessionState {
    return new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
}

/**
 * Opencode-style mainline: the user message anchors the turn, execution steps
 * carry status glyphs, and the final answer is plain text. Routine turn
 * start/completion rows stay out of the transcript; failures still surface.
 */
@Suite('timeline mainline follows opencode')
export class TimelineOpencodeMainlineTest {
    @Test('the final answer renders without a status glyph')
    finalAnswerIsPlain() {
        const items = renderAgentConsoleMessageItems([{
            id: 'a1',
            role: 'assistant',
            content: 'Here is the summary.',
            createdAt: 2,
            metadata: { finishReason: 'stop' }
        } as any], { timelineMode: true });
        expect(items[0].lines[0].status?.trim()).toEqual('');
    }

    @Test('preamble prose renders without a status glyph')
    preambleIsPlain() {
        const items = renderAgentConsoleMessageItems([{
            id: 'a1',
            role: 'assistant',
            content: 'Let me check the workspace first.',
            createdAt: 2,
            metadata: { preamble: true }
        } as any], { timelineMode: true });
        expect(items[0].lines[0].status?.trim()).toEqual('');
    }

    @Test('tool rows keep their status glyph')
    toolRowsKeepGlyph() {
        const items = renderAgentConsoleMessageItems([{
            id: 'e1',
            role: 'assistant',
            content: '读取文件 · README.md',
            createdAt: 2,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success' }
        } as any], { timelineMode: true });
        expect(items[0].lines[0].status?.trim()).toEqual('✓');
    }

    @Test('routine turn start/completion rows stay hidden in every timeline mode')
    routineLifecycleRowsStayHidden() {
        const consoleState = state();
        consoleState.upsertUiEventMessage('turn-start', 'Analyzing request', {
            eventType: 'turn_started', label: 'state', status: 'running'
        });
        consoleState.upsertUiEventMessage('tool-weather', 'weather completed · Hangzhou', {
            eventType: 'tool_completed', label: 'tool', status: 'success'
        });
        consoleState.upsertUiEventMessage('turn-complete', 'Turn completed', {
            eventType: 'turn', label: 'turn', status: 'success'
        });
        for (const mode of ['steps', 'compact', 'verbose'] as const) {
            consoleState.setTimelineMode(mode);
            expect(consoleState.displayMessages.map(message => message.content)).toEqual([
                'weather completed · Hangzhou'
            ]);
        }
    }

    @Test('hidden-event summaries render as a quiet collapsed row')
    summaryRowIsQuiet() {
        const item = renderAgentConsoleMessageItems([{
            id: '__timeline_hidden_summary__',
            role: 'assistant',
            content: '已隐藏 7 条事件 · 紧凑模式仅显示当前步骤与错误',
            createdAt: 2,
            metadata: { uiKind: 'timeline-collapsed', uiEventType: 'timeline_summary', status: 'success', label: 'timeline' }
        } as any], { timelineMode: true })[0];
        expect(item.lines[0].status?.trim() || '').toEqual('');
        expect(item.lines[0].role?.trim()).toEqual('⋮');
    }

    @Test('failed and cancelled turns still show their row')
    failuresStillShow() {
        const consoleState = state();
        consoleState.upsertUiEventMessage('turn-complete', 'Turn completed', {
            eventType: 'turn_completed', label: 'turn', status: 'failed'
        });
        consoleState.upsertUiEventMessage('turn-cancel', 'Turn cancelled', {
            eventType: 'turn_cancelled', label: 'state', status: 'cancelled'
        } as any);
        consoleState.setTimelineMode('verbose');
        expect(consoleState.displayMessages.map(message => message.content)).toEqual([
            'Turn completed',
            'Turn cancelled'
        ]);
    }
}
