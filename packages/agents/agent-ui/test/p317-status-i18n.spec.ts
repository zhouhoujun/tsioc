import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState, AgentConsoleStatusPanelComponent } from '../src';

/**
 * P317: status-line and context-diagnostics strings were built in the state
 * (no locale) and the status panel, so zh-CN still showed
 * `Approval required: …` and `context unchanged · level light · …`.
 */
@Suite('derived status/diagnostic labels are localized (P317)')
export class StatusI18nTest {
    private translator = {
        translate: (key: string, params?: any) => {
            if (key === 'agent.context.strategy') return `上下文:${params?.strategy}`;
            if (key === 'agent.status.approvalRequired') return `需要审批:${params?.tool}`;
            return `T:${key}`;
        }
    };

    private report(): any {
        return {
            strategy: 'unchanged',
            level: 'light',
            summaryInserted: false,
            beforeMessageCount: 6,
            afterMessageCount: 6,
            beforeTokens: 168,
            afterTokens: 168,
            compressionRatio: 0,
            retentionRate: 100
        };
    }

    @Test('the context-preparation summary goes through the translator')
    async contextSummaryLocalized() {
        const state = new AgentConsoleSessionState(undefined, this.translator as any);
        const summary = (state as any).formatContextPreparationSummary(this.report());
        expect(summary).toContain('上下文:unchanged');
        expect(summary).not.toContain('context unchanged');
    }

    @Test('without a translator the English summary is kept')
    async contextSummaryFallback() {
        const state = new AgentConsoleSessionState();
        const summary = (state as any).formatContextPreparationSummary(this.report());
        expect(summary).toContain('context unchanged');
    }

    @Test('the status panel localizes the pending-approval line')
    async statusApprovalLocalized() {
        const state = new AgentConsoleSessionState(undefined, this.translator as any);
        state.setPendingApprovals([{
            id: 'approval-p317', toolName: 'delete_file', sessionId: 'console',
            reason: 'r', summary: 's', hasInput: true, createdAt: 1, timeoutMs: 30000, expiresAt: Date.now() + 30000
        }]);
        const panel = new AgentConsoleStatusPanelComponent(state, this.translator as any);
        expect(panel.statusSummary).toContain('需要审批:delete_file');
    }
}
