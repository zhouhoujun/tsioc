import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { presentAgentConsoleSessionContent } from '../src';

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
