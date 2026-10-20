import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleApprovalsPanelComponent, AgentConsoleSessionState } from '../src';
import { selectApprovalRequest } from '../src/AgentConsoleApprovalView';

/**
 * P315: the approvals panel used hardcoded English for the title, actions and
 * count labels even though the component has a translator — a user-visible
 * string that bypassed i18n (AGENTS.md §9).
 */
@Suite('approval panel labels are localized (P315)')
export class ApprovalPanelI18nTest {
    private stateWithApproval(): AgentConsoleSessionState {
        const state = new AgentConsoleSessionState();
        state.sessionId = 'session-p315';
        state.setPendingApprovals([{
            id: 'approval-p315',
            toolName: 'delete_file',
            sessionId: 'session-p315',
            reason: 'requires approval',
            summary: 'delete_file',
            hasInput: true,
            createdAt: Date.now(),
            timeoutMs: 30000,
            expiresAt: Date.now() + 30000
        }]);
        state.setApprovalsFocused(true);
        return state;
    }

    @Test('title, actions and count go through the translator')
    async labelsUseTranslator() {
        const translator = { translate: (key: string) => `T:${key}` };
        const panel = new AgentConsoleApprovalsPanelComponent(this.stateWithApproval(), translator as any);
        expect(panel.approvalActionsLabel).toBe('T:agent.approval.actions');
        expect(panel.approvalsTitleLabel).toBe('T:agent.approval.allowPrompt');
        expect(panel.approvalsSummaryLabel).toContain('T:agent.dashboard.approvals');
        expect(panel.selectedApprovalDetailLabel).toContain('T:agent.approval.reason');
        expect(panel.accessibilityLabel).toBe('T:agent.approval.accessibilitySelected');
    }

    @Test('a structured reason code renders through the catalog')
    async structuredReason() {
        const translator = {
            translate: (key: string, params?: any) => {
                if (key === 'agent.approval.reasonCode.tool-requires-approval') return `需要审批:${params?.tool}`;
                if (key === 'agent.approval.reason') return `原因：${params?.reason}`;
                return `T:${key}`;
            }
        };
        const state = this.stateWithApproval();
        state.pendingApprovals[0].reasonDetail = { code: 'tool-requires-approval', params: { tool: 'delete_file' } };
        const panel = new AgentConsoleApprovalsPanelComponent(state, translator as any);
        expect(panel.selectedApprovalDetailLabel).toContain('需要审批:delete_file');
    }

    @Test('the /approvals inspector detail lines go through the translator')
    async inspectorUsesTranslator() {
        const translate = (key: string) => `T:${key}`;
        let capturedTitle = '';
        let captured: any[] = [];
        const select = async (title: string, options: any[]) => {
            capturedTitle = title;
            captured = options;
            return options[0].value;
        };
        const request = {
            id: 'approval-p315', toolName: 'delete_file', reason: 'requires approval',
            inputSummary: '{"path":"x"}', timeoutMs: 30000, expiresAt: Date.now() + 30000
        };
        const selected = await selectApprovalRequest(
            select as any,
            { consoleOptions: { selectHint: 'hint' } },
            [request, { ...request, id: 'approval-p315-b' }],
            0,
            translate
        );
        expect(selected?.id).toBe('approval-p315');
        expect(capturedTitle).toBe('T:agent.approval.pendingTitle');
        expect(captured[0].detail).toContain('T:agent.approval.tool');
        expect(captured[0].detail).toContain('T:agent.approval.reason');
        expect(captured[0].detail).toContain('T:agent.approval.input');
        expect(captured[0].detail).toContain('T:agent.approval.timeout');
        expect(captured[0].detail).toContain('T:agent.approval.expiresAt');
    }

    @Test('without a translator the English catalog fallback still renders')
    async labelsFallback() {
        const panel = new AgentConsoleApprovalsPanelComponent(this.stateWithApproval());
        expect(panel.approvalActionsLabel).toBe('a Allow   d Deny   y Copy   ↑↓ Move   Esc Dismiss');
        expect(panel.approvalsTitleLabel).toBe('Approval required · Allow delete_file?');
        expect(panel.selectedApprovalDetailLabel).toContain('Reason: requires approval');
        expect(panel.accessibilityLabel).toBe('Approvals. 1 pending. Selected: delete_file.');
    }
}
