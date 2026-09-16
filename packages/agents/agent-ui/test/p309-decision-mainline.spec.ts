import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleMessageRenderer,
    AgentConsoleMessageRendererRegistry,
    presentAgentConsoleSessionContent,
    projectAgentConsoleDecisionMainline,
    renderAgentConsoleMessageItem
} from '../src';

function decision(id: string, metadata: Record<string, any>, content = ''): any {
    return { id, role: 'assistant', content, createdAt: 1, metadata };
}

@Suite('P309 decision mainline')
export class DecisionMainlineSuite {
    @Test('IoC renderer registry dynamically overrides a supported content kind')
    dynamicRendererRegistration() {
        class DecisionRenderer extends AgentConsoleMessageRenderer {
            override readonly priority = 100;
            supports(message: any): boolean { return message.metadata?.uiKind === 'question'; }
            resolve(): any {
                return {
                    templateKind: 'assistant', roleLabel: '? ',
                    roleStyle: () => ({}), itemStyle: () => ({}),
                    lead: () => '', continuationLead: () => ''
                };
            }
        }
        const registry = new AgentConsoleMessageRendererRegistry([new DecisionRenderer()]);
        const rendered = renderAgentConsoleMessageItem(
            decision('q1', { uiKind: 'question' }, 'Continue?'),
            { rendererRegistry: registry }
        );
        expect(rendered.lines[0].role).toEqual('? ');
    }

    @Test('keeps the latest question state and folds its generic event')
    questionLifecycle() {
        const messages = [
            decision('event', { uiKind: 'event', uiEventType: 'ask_user', questionId: 'q1' }, 'Question requested'),
            decision('pending', { uiKind: 'question', questionId: 'q1', question: 'Deploy now?', status: 'pending' }),
            decision('answered', { uiKind: 'question', questionId: 'q1', question: 'Deploy now?', status: 'answered', answer: 'Later' })
        ];
        const projected = projectAgentConsoleDecisionMainline(messages);
        expect(projected).toHaveLength(1);
        expect(projected[0].content).toEqual('Deploy now? - answered: Later');
        expect(projected[0].metadata?.causalKey).toEqual('decision:q1');
    }

    @Test('approval preserves action risk and scope while resolving compactly')
    approvalLifecycle() {
        const [approval] = projectAgentConsoleDecisionMainline([
            decision('a1', { uiKind: 'approval', approvalId: 'a1', summary: 'Run deploy', risk: 'production write', scope: 'once', status: 'approved', decision: 'allow' })
        ]);
        expect(approval.content).toEqual('Run deploy - approved: allow (once)');
        expect(approval.metadata?.risk).toEqual('production write');
        expect(presentAgentConsoleSessionContent(approval).kind).toEqual('approval');
    }

    @Test('denied and expired checkpoints are neutral terminal records')
    terminalStates() {
        const projected = projectAgentConsoleDecisionMainline([
            decision('a1', { uiKind: 'approval', approvalId: 'a1', summary: 'Delete cache', status: 'rejected' }),
            decision('q1', { uiKind: 'question', questionId: 'q1', question: 'Continue?', status: 'expired' })
        ]);
        expect(projected.map(message => message.content)).toEqual(['Delete cache - denied', 'Continue? - expired']);
    }

    @Test('projection is replay-idempotent')
    replayIdempotency() {
        const messages = [
            decision('old', { uiKind: 'approval', approvalId: 'a1', summary: 'Write file', status: 'pending' }),
            decision('new', { uiKind: 'approval', approvalId: 'a1', summary: 'Write file', status: 'approved' })
        ];
        const once = projectAgentConsoleDecisionMainline(messages);
        expect(projectAgentConsoleDecisionMainline(once)).toEqual(once);
    }
}
