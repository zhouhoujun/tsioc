import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleDiagnosticMessageRenderer,
    AgentConsoleMessageRendererRegistry,
    projectAgentConsoleDiagnosticMainline,
    renderAgentConsoleMessageItem
} from '../src';

function event(id: string, content: string, metadata: Record<string, any>): any {
    return { id, role: 'assistant', content, createdAt: 1, metadata: { uiKind: 'event', ...metadata } };
}

@Suite('P310 diagnostic and background mainline')
export class DiagnosticMainlineSuite {
    @Test('failure replaces a warning for the same causal item and keeps detail routing')
    causalFailure() {
        const projected = projectAgentConsoleDiagnosticMainline([
            event('warn', 'retrying', { warning: true, causalKey: 'tool:t1' }),
            event('fail', 'raw stack', { status: 'error', causalKey: 'tool:t1', rootCause: 'permission denied', stack: 'full stack' })
        ]);
        expect(projected).toHaveLength(1);
        expect(projected[0].content).toEqual('permission denied');
        expect(projected[0].metadata?.stack).toEqual('full stack');
        expect(projected[0].metadata?.detailRef).toEqual('fail');
    }

    @Test('cancellation uses a neutral terminal status')
    cancellation() {
        const [message] = projectAgentConsoleDiagnosticMainline([
            event('cancel', 'Stopped by user', { uiEventType: 'turn_cancelled', status: 'failed' })
        ]);
        expect(message.content).toEqual('Stopped by user');
        expect(message.metadata?.status).toEqual('cancelled');
    }

    @Test('background lifecycle collapses to owner task status and final outcome')
    backgroundLifecycle() {
        const projected = projectAgentConsoleDiagnosticMainline([
            event('start', 'starting', { uiEventType: 'background_task_started', taskId: 'bg-1', owner: 'worker-a', goal: 'Run tests' }),
            event('tool', 'internal command', { uiEventType: 'tool_completed', taskId: 'bg-1' }),
            event('done', 'done', { uiEventType: 'background_task_completed', taskId: 'bg-1', owner: 'worker-a', goal: 'Run tests', summary: '42 passed' })
        ]);
        expect(projected.map(message => message.id)).toEqual(['done']);
        expect(projected[0].content).toEqual('worker-a: Run tests - completed: 42 passed');
        expect(projected[0].metadata?.causalKey).toEqual('background:bg-1');
    }

    @Test('failed background result is never swallowed by a completed replay')
    backgroundFailureWins() {
        const [message] = projectAgentConsoleDiagnosticMainline([
            event('failed', 'failed', { uiEventType: 'background_task_failed', taskId: 'bg-1', goal: 'Build', error: 'compile failed' }),
            event('done', 'done', { uiEventType: 'background_task_completed', taskId: 'bg-1', goal: 'Build' })
        ]);
        expect(message.content).toEqual('Build - failed: compile failed');
        expect(message.metadata?.status).toEqual('failed');
    }

    @Test('built-in diagnostic renderer resolves through the IoC registry')
    diagnosticRenderer() {
        const registry = new AgentConsoleMessageRendererRegistry([new AgentConsoleDiagnosticMessageRenderer()]);
        const message = event('e1', 'boom', { diagnosticSummary: true, status: 'error' });
        expect(registry.resolve(message, 'assistant').roleLabel).toEqual('! ');
        expect(renderAgentConsoleMessageItem(message, { rendererRegistry: registry }).lines).toHaveLength(1);
    }
}
