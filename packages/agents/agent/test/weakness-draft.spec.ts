import expect = require('expect');
import { Test } from '@tsdi/unit';
import { buildAgentsRuleDraft } from '../src/harness/WeaknessMiner';

export class WeaknessDraftSpec {
    @Test('renders reviewable AGENTS rule drafts from audit suggestions')
    rendersDraft() {
        const draft = buildAgentsRuleDraft({
            generatedAt: 1, scopedSessionIds: [], totalTurns: 1, totalToolAttempts: 2,
            failureTurnRate: 100, topFailingTools: [],
            errorClusters: [{ signature: 'ECONNREFUSED', count: 2, examples: [], toolNames: ['terminal'], suggestedPolicy: 'review network access' }],
            falsifiedDistribution: [], suggestions: [{ kind: 'approval', toolName: 'terminal', message: 'Require approval.' }], empty: false
        });
        expect(draft).toContain('Learned Harness Rules');
        expect(draft).toContain('Require approval.');
        expect(draft).toContain('Review each rule');
    }
}
