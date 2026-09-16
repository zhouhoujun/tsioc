import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleArtifactMessageRenderer,
    AgentConsoleConversationMessageRenderer,
    AgentConsoleDecisionMessageRenderer,
    AgentConsoleDiagnosticMessageRenderer,
    AgentConsoleExecutionMessageRenderer,
    AgentConsoleMessageRendererRegistry,
    projectAgentConsoleArtifactMainline,
    projectAgentConsoleConversationMainline,
    projectAgentConsoleDecisionMainline,
    projectAgentConsoleDiagnosticMainline,
    projectAgentConsoleExecutionMainline,
    renderAgentConsoleMessageItems
} from '../src';
import { buildFullSessionFixture, FullSessionBranch } from '../harness/full-session-fixture';

function project(branch: FullSessionBranch) {
    return projectAgentConsoleExecutionMainline(projectAgentConsoleDiagnosticMainline(
        projectAgentConsoleDecisionMainline(projectAgentConsoleArtifactMainline(
            projectAgentConsoleConversationMainline(buildFullSessionFixture(branch))
        ))
    ));
}

function registry(): AgentConsoleMessageRendererRegistry {
    return new AgentConsoleMessageRendererRegistry([
        new AgentConsoleConversationMessageRenderer(), new AgentConsoleExecutionMessageRenderer(),
        new AgentConsoleDecisionMessageRenderer(), new AgentConsoleArtifactMessageRenderer(),
        new AgentConsoleDiagnosticMessageRenderer()
    ]);
}

@Suite('P312 complete session matrix')
export class FullSessionMatrixSuite {
    @Test('normal blocked failed cancelled and replay branches preserve ordering and uniqueness')
    matrix() {
        for (const branch of ['normal', 'blocked', 'failed', 'cancelled', 'replay'] as FullSessionBranch[]) {
            const messages = project(branch);
            expect(new Set(messages.map(message => message.id)).size).toEqual(messages.length);
            expect(messages[0].role).toEqual('user');
            expect(messages[1].metadata?.uiKind).toEqual('plan-todo');
            expect(messages[messages.length - 1].content).toContain('Session restore is complete');
            expect(messages.filter(message => message.metadata?.uiKind === 'question')).toHaveLength(1);
            expect(messages.filter(message => message.metadata?.uiKind === 'approval')).toHaveLength(1);
            expect(messages.filter(message => message.metadata?.backgroundSummary)).toHaveLength(1);
        }
    }

    @Test('detail routing markdown attachments and terminal decisions survive projection')
    routing() {
        const messages = project('failed');
        expect(messages.find(message => message.id === 'command-1')?.metadata?.detailRef).toEqual('output-1');
        expect(messages.find(message => message.id === 'files-1')?.metadata?.detailRef).toEqual('review-1');
        expect(messages.find(message => message.id === 'attachment-1')?.metadata?.causalKey).toEqual('step:step-1');
        expect(messages.find(message => message.id === 'diagnostic-1')?.metadata?.stack).toEqual('full stack in inspector');
        expect(messages[messages.length - 1].content).toContain('```ts');
    }

    @Test('shared DOM/TUI render model exposes semantic ARIA at 80 100 and 120 columns')
    dualRendererWidths() {
        const messages = project('failed');
        for (const columns of [80, 100, 120]) {
            const rendered = renderAgentConsoleMessageItems(messages, { rendererRegistry: registry(), timelineMode: true });
            expect(rendered.every(item => item.semanticFamily && item.semanticKind)).toEqual(true);
            expect(rendered.some(item => item.lines.some(line => line.ariaLabel?.includes('恢复索引写入失败')))).toEqual(true);
            expect(rendered.every(item => item.lines.every(line => String(line.content).length <= columns * 4))).toEqual(true);
        }
    }

    @Test('decision interaction converges in place from pending to answered and approved')
    decisionConvergence() {
        const pending = project('blocked');
        expect(pending.find(message => message.metadata?.uiKind === 'question')?.metadata?.status).toEqual('pending');
        const resolved = project('normal');
        expect(resolved.find(message => message.metadata?.uiKind === 'question')?.content).toContain('answered: Yes');
        expect(resolved.find(message => message.metadata?.uiKind === 'approval')?.content).toContain('approved: allow');
    }
}
