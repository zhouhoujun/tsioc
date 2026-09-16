import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState, presentAgentConsoleSessionContent, projectAgentConsoleExecutionMainline } from '../src';

function message(id: string, content: string, metadata?: Record<string, any>, role: 'user' | 'assistant' = 'assistant'): any {
    return { id, role, content, createdAt: Number(id.replace(/\D/g, '')) || 1, metadata };
}

@Suite('execution mainline projection (P307)')
export class ExecutionMainlineProjectionTest {
    @Test('completed reasoning becomes one supporting Thought summary')
    thoughtSummary() {
        const projected = projectAgentConsoleExecutionMainline([
            message('u1', 'Fix it', undefined, 'user'),
            message('r1', 'first private diagnostic field\nmore detail', { uiKind: 'event', uiEventType: 'reasoning', status: 'success' }),
            message('r2', `Useful reasoning ${'detail '.repeat(40)}`, { uiKind: 'event', uiEventType: 'reasoning', status: 'success' }),
            message('a1', 'Done', { streaming: false })
        ]);
        const thoughts = projected.filter(item => item.metadata?.uiEventType === 'reasoning');
        expect(thoughts).toHaveLength(1);
        expect(thoughts[0].id).toEqual('r2');
        expect(thoughts[0].content.length).toBeLessThanOrEqual(120);
        expect(presentAgentConsoleSessionContent(thoughts[0]).priority).toEqual('supporting');
        expect(thoughts[0].metadata?.detailRef).toEqual('r2');
    }

    @Test('running reasoning keeps current progress')
    runningThought() {
        const projected = projectAgentConsoleExecutionMainline([
            message('u1', 'Fix it', undefined, 'user'),
            message('r1', 'Inspecting parser\nprivate trace', { uiKind: 'event', uiEventType: 'reasoning', status: 'running' })
        ]);
        expect(projected[1].content).toEqual('Inspecting parser');
        expect(presentAgentConsoleSessionContent(projected[1]).priority).toEqual('active');
    }

    @Test('command mainline excludes stdout and routes output detail')
    commandSummary() {
        const projected = projectAgentConsoleExecutionMainline([
            message('u1', 'Run tests', undefined, 'user'),
            message('c1', 'RAW STDOUT SHOULD NOT APPEAR', {
                uiKind: 'command-execution', command: 'npm', args: 'test', status: 'succeeded', outputIds: ['output-1']
            })
        ]);
        expect(projected[1].content).toEqual('npm test completed');
        expect(projected[1].content).not.toContain('STDOUT');
        expect(projected[1].metadata?.detailRef).toEqual('output-1');
    }

    @Test('failed command preserves the error tail')
    commandErrorTail() {
        const cause = `prefix ${'x'.repeat(200)} ROOT_CAUSE`;
        const projected = projectAgentConsoleExecutionMainline([
            message('u1', 'Run tests', undefined, 'user'),
            message('c1', 'raw', { uiKind: 'command-execution', command: 'npm test', status: 'failed', error: cause })
        ]);
        expect(projected[1].content).toContain('npm test failed');
        expect(projected[1].content).toContain('ROOT_CAUSE');
        expect(projected[1].content).not.toContain('prefix');
    }

    @Test('preamble then thought/tool/command then final has stable order')
    stableOrder() {
        const projected = projectAgentConsoleExecutionMainline([
            message('u1', 'Fix it', undefined, 'user'),
            message('p1', 'I will inspect.', { preamble: true }),
            message('a1', 'Final answer', { streaming: false }),
            message('r1', 'Inspecting', { uiKind: 'event', uiEventType: 'reasoning', status: 'success' }),
            message('t1', 'Read file', { uiKind: 'event', uiEventType: 'tool_completed', status: 'success' }),
            message('c1', 'raw', { uiKind: 'command-execution', command: 'npm test', status: 'succeeded' })
        ]);
        expect(projected.map(item => item.id)).toEqual(['u1', 'p1', 'r1', 't1', 'c1', 'a1']);
    }

    @Test('hidden reasoning stays absent from the state projection')
    hiddenReasoning() {
        const state = new AgentConsoleSessionState();
        state.setMessages([
            message('u1', 'Fix it', undefined, 'user'),
            message('r1', 'private chain of thought', { uiKind: 'event', uiEventType: 'reasoning', status: 'success' }),
            message('a1', 'Done', { streaming: false })
        ]);
        state.setShowThinking(false);
        expect(state.displayMessages.map(item => item.id)).toEqual(['u1', 'a1']);
    }
}
