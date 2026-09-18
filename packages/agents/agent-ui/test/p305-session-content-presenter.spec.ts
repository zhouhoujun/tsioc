import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    presentAgentConsoleSessionContent,
    projectAgentConsoleExecutionMainline,
    projectAgentConsoleTimelineDurations
} from '../src';

function message(over: Record<string, any>): any {
    return { id: 'm1', role: 'assistant', content: 'content', createdAt: 1, ...over };
}

@Suite('session content presenter (P305)')
export class SessionContentPresenterTest {
    @Test('classifies conversation anchors independently from uiKind')
    conversation() {
        expect(presentAgentConsoleSessionContent(message({ role: 'user', content: 'Fix the tests' })).kind).toEqual('user');
        expect(presentAgentConsoleSessionContent(message({ content: 'Done' })).kind).toEqual('assistant-final');
        expect(presentAgentConsoleSessionContent(message({ content: 'Checking', metadata: { streaming: true } })).kind).toEqual('assistant-partial');
    }

    @Test('classifies execution, decision, artifact and diagnostic families')
    semanticFamilies() {
        const cases = [
            [message({ metadata: { uiKind: 'event', uiEventType: 'reasoning', status: 'running' } }), 'execution', 'thought'],
            [message({ metadata: { uiKind: 'event', uiEventType: 'tool_completed', timeline: { toolCallId: 't1' } } }), 'execution', 'tool'],
            [message({ metadata: { uiKind: 'event', uiEventType: 'turn_completed', status: 'success' } }), 'execution', 'event'],
            [message({ metadata: { uiKind: 'approval' } }), 'decision', 'approval'],
            [message({ metadata: { uiKind: 'question' } }), 'decision', 'question'],
            [message({ metadata: { uiKind: 'plan-todo' } }), 'artifact', 'plan'],
            [message({ metadata: { uiKind: 'file-change' } }), 'artifact', 'file-change'],
            [message({ metadata: { error: true } }), 'diagnostic', 'error'],
            [message({ role: 'system' }), 'diagnostic', 'system']
        ];
        cases.forEach(([input, family, kind]) => {
            const presented = presentAgentConsoleSessionContent(input as any);
            expect(presented.family).toEqual(family);
            expect(presented.kind).toEqual(kind);
        });
    }

    @Test('keeps lifecycle events in place instead of treating them as final answers')
    lifecycleOrder() {
        const messages = [
            message({ id: 'u', role: 'user', content: 'request', createdAt: 1 }),
            message({ id: 'start', content: 'Started', createdAt: 2,
                metadata: { uiKind: 'event', uiEventType: 'turn_started', status: 'running' } }),
            message({ id: 'answer', content: 'Final answer', createdAt: 3 }),
            message({ id: 'end', content: 'Completed', createdAt: 4,
                metadata: { uiKind: 'event', uiEventType: 'turn_completed', status: 'success' } })
        ];
        expect(projectAgentConsoleExecutionMainline(messages).map(item => item.id))
            .toEqual(['u', 'start', 'end', 'answer']);
    }

    @Test('derives elapsed time for every event without replacing exact durations')
    timelineDurations() {
        const projected = projectAgentConsoleTimelineDurations([
            message({ id: 'start', createdAt: 1000,
                metadata: { uiKind: 'event', uiEventType: 'turn_started', status: 'running' } }),
            message({ id: 'tool', createdAt: 1250,
                metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success', durationMs: 40 } }),
            message({ id: 'end', createdAt: 1800,
                metadata: { uiKind: 'event', uiEventType: 'turn_completed', status: 'success' } })
        ] as any);
        expect(projected.map(item => item.metadata?.durationMs)).toEqual([undefined, 40, 800]);
    }

    @Test('derives stable detail and causal routing metadata')
    routing() {
        const presented = presentAgentConsoleSessionContent(message({
            id: 'event-1', content: 'Running shell\nraw detail',
            metadata: { uiKind: 'event', uiEventType: 'tool_invoked', uiEventKey: 'tool:t1', status: 'running', durationMs: 25 }
        }));
        expect(presented.summary).toEqual('Running shell');
        expect(presented.detailRef).toEqual('event-1');
        expect(presented.causalKey).toEqual('tool:t1');
        expect(presented.meta).toEqual(['25ms', 'running']);
        expect(presented.priority).toEqual('active');
    }

    @Test('classifies a standalone file part as an attachment artifact')
    fileAttachment() {
        const presented = presentAgentConsoleSessionContent(message({
            content: '',
            parts: [{ type: 'file', dataUrl: 'data:text/plain;base64,eA==', mediaType: 'text/plain', name: 'notes.txt' }]
        }));
        expect(presented.family).toEqual('artifact');
        expect(presented.kind).toEqual('attachment');
    }
}
