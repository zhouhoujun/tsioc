import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState, projectAgentConsoleArtifactMainline } from '../src';

@Suite('P308 artifact mainline')
export class ArtifactMainlineSuite {
    @Test('keeps the latest plan revision and suppresses correlated restatements idempotently')
    planRevisionReplay() {
        const messages: any[] = [
            { id: 'p1', role: 'assistant', content: 'old', metadata: { uiKind: 'plan-todo', planId: 'plan-1', planRevision: 1 } },
            { id: 'p2', role: 'assistant', content: 'new', metadata: { uiKind: 'plan-todo', planId: 'plan-1', planRevision: 2 } },
            { id: 'p2-replay', role: 'assistant', content: 'new', metadata: { uiKind: 'plan-todo', planId: 'plan-1', planRevision: 2 } },
            { id: 'boundary', role: 'assistant', content: 'step', metadata: { uiKind: 'timeline-boundary', planId: 'plan-1', planStepId: 's1' } },
            { id: 'event', role: 'assistant', content: 'step running', metadata: { uiKind: 'event', planId: 'plan-1', stepId: 's1' } }
        ];
        const once = projectAgentConsoleArtifactMainline(messages);
        expect(once.map(message => message.id)).toEqual(['p2-replay', 'boundary']);
        expect(projectAgentConsoleArtifactMainline(once)).toEqual(once);
    }

    @Test('binds attachments to their source message or plan step')
    attachmentCause() {
        const [message] = projectAgentConsoleArtifactMainline([{
            id: 'artifact-1', role: 'assistant', content: '', parts: [{ type: 'file', name: 'report.txt', dataUrl: 'data:text/plain,x' }],
            metadata: { stepId: 'step-2' }
        } as any]);
        expect(message.metadata?.sourceMessageId).toEqual('artifact-1');
        expect(message.metadata?.causalKey).toEqual('step:step-2');
    }

    @Test('aggregates repeated edits and labels add rename and delete without inline hunks')
    fileChanges() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openReview({ id: 'review-1', metadata: { stepId: 'step-2' } }, { diff: [
            'diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n+one',
            'diff --git a/src/a.ts b/src/a.ts\n--- a/src/a.ts\n+++ b/src/a.ts\n-two\n+three',
            'diff --git a/src/new.ts b/src/new.ts\nnew file mode 100644\n--- /dev/null\n+++ b/src/new.ts\n+new',
            'diff --git a/src/old.ts b/src/moved.ts\nsimilarity index 100%\nrename from src/old.ts\nrename to src/moved.ts',
            'diff --git a/src/gone.ts b/src/gone.ts\ndeleted file mode 100644\n--- a/src/gone.ts\n+++ /dev/null\n-old'
        ].join('\n') });
        const message = state.displayMessages.find(item => item.id === '__file_change_inline__')!;
        expect(message.content).toContain('files changed: 4');
        expect(message.content).toContain('src/a.ts [update] (+2 -1)');
        expect(message.content).toContain('src/new.ts [add] (+1 -0)');
        expect(message.content).toContain('src/moved.ts [rename] (+0 -0)');
        expect(message.content).toContain('src/gone.ts [delete] (+0 -1)');
        expect(message.content).not.toContain('diff --git');
        expect(message.metadata?.causalKey).toEqual('step:step-2');
    }

    @Test('does not create a file change artifact for an empty diff')
    emptyDiff() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openReview({ id: 'review-empty' }, { diff: '' });
        expect(state.displayMessages.some(item => item.id === '__file_change_inline__')).toEqual(false);
    }
}
