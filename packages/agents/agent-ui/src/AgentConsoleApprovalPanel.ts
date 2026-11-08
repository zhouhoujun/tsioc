import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { resolveListWindow as resolveConsoleListWindow } from '@tsdi/components/common';
import { formatAgentConsoleApprovalInput } from './AgentConsoleApprovalInput';
import { DIALOG_CLOSE_STYLE, menuShellStyle, resolvePanelThemeStyles } from './AgentConsolePanelStyles';
import { AgentConsoleApprovalRequest, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentConsoleTheme, AgentConsoleThemeStyles, defaultAgentConsoleTheme } from './AgentConsoleTheme';

/**
 * Permission prompt shown above the composer.
 *
 * Mirrors opencode's permission interaction: every pending request is a
 * clickable row and the three decisions are clickable options, so a mouse can
 * resolve a prompt without typing `a`/`d`/`A`.
 */
@Component({
    selector: 'agent-console-approvals-panel',
    template: `
    <div class="console-panel console-approvals-panel" role="dialog" aria-label="{{accessibilityLabel}}"><label class="dialog-close" data-cell-width="2" @click="closeApproval">✕</label>
        <label class="approval-title">{{approvalsTitleLabel}}</label>
        <label class="approval-summary" v-show="approvalsSummaryLabel">{{approvalsSummaryLabel}}</label>
        <label class="approval-item" data-selected="{{item.selected}}" v-for="item in approvalItems" @click="selectApproval(item.id)">{{item.label}}</label>
        <label class="approval-detail" v-for="line in selectedApprovalRequestLines">{{line}}</label>
        <label class="approval-detail" v-for="line in selectedApprovalDetailLines">{{line}}</label>
        <label class="approval-option approval-option-once" @click="approveSelected"><span class="approval-key" aria-hidden="true">a  </span>{{allowOnceLabel}}</label>
        <label class="approval-option approval-option-always" @click="approveAlwaysSelected"><span class="approval-key" aria-hidden="true">A  </span>{{allowAlwaysLabel}}</label>
        <label class="approval-option approval-option-deny" @click="denySelected"><span class="approval-key" aria-hidden="true">d  </span>{{denyLabel}}</label>
        <label class="approval-actions" v-show="approvalActionsLabel">{{approvalActionsLabel}}</label>
    </div>
    `
})
export class AgentConsoleApprovalsPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    private translate(key: string, params: Record<string, any> | undefined, fallback: string): string {
        return this.translator?.translate(key, params) || fallback;
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get approvals(): AgentConsoleApprovalRequest[] {
        return this.state.pendingApprovals;
    }

    get shellStyle() { return this.shouldShow ? menuShellStyle(this.activeTheme) : {}; } get closeStyle() { return DIALOG_CLOSE_STYLE; }
    async closeApproval(): Promise<void> { await this.denySelected(); }
    async approveSelected(): Promise<void> { await this.resolveSelected('approve'); }
    async approveAlwaysSelected(): Promise<void> { const approval = this.state.selectedApproval; if (approval) await this.state.approvalAlwaysAllowAction?.(approval.id); }
    async denySelected(): Promise<void> { await this.resolveSelected('deny'); }
    selectApproval(id: string): void { this.state.setSelectedApprovalId(id); this.state.setApprovalsFocused(true); }
    protected async resolveSelected(decision: 'approve' | 'deny'): Promise<void> {
        const approval = this.state.selectedApproval;
        if (approval) await this.state.resolveApprovalAction?.(decision, approval.id);
    }
    get allowOnceLabel(): string { return this.translate('agent.approval.allowOnce', undefined, 'Allow once'); }
    get allowAlwaysLabel(): string { return this.translate('agent.approval.allowAlways', undefined, 'Always allow (session)'); }
    get denyLabel(): string { return this.translate('agent.approval.deny', undefined, 'Deny'); }
    get allowOptionStyle() { return this.activeThemeStyles.toolsAccent; }
    get denyOptionStyle() { return this.activeThemeStyles.statusErrorValue; }

    get accentStyle() {
        return this.activeThemeStyles.toolsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get detailStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get approvalItems(): Array<{ id: string; label: string; selected: boolean }> {
        if (!this.shouldShow) {
            return [];
        }
        return this.visibleApprovals.map(request => {
            const selected = this.state.selectedApprovalId === request.id;
            return {
                id: request.id,
                selected,
                label: `${selected ? '›' : ' '} ${request.toolName} (${request.id.slice(0, 8)})`
            };
        });
    }

    get approvalListLabel(): string {
        if (!this.shouldShow || !this.approvalItems.length) {
            return '';
        }
        return this.approvalItems.map(item => item.label).join('\n');
    }

    get approvalListLines(): string[] {
        const label = this.approvalListLabel;
        return label ? label.split('\n') : [];
    }

    get selectedApprovalRequestLines(): string[] {
        const label = this.selectedApprovalRequestLabel;
        return label ? label.split('\n') : [];
    }

    get selectedApprovalDetailLines(): string[] {
        const label = this.selectedApprovalDetailLabel;
        return label ? label.split('\n') : [];
    }

    get visibleApprovalStart(): number {
        const selectedIndex = Math.max(0, this.approvals.findIndex(item => item.id === this.state.selectedApprovalId));
        return resolveConsoleListWindow(
            this.approvals.length,
            selectedIndex,
            this.state.consoleOptions.approvalsVisibleItems
        ).start;
    }

    get visibleApprovals(): AgentConsoleApprovalRequest[] {
        return this.approvals.slice(
            this.visibleApprovalStart,
            this.visibleApprovalStart + this.state.consoleOptions.approvalsVisibleItems
        );
    }

    get approvalsSummaryLabel(): string {
        if (!this.shouldShow || !this.approvals.length) {
            return '';
        }
        const selectedIndex = Math.max(0, this.approvals.findIndex(item => item.id === this.state.selectedApprovalId));
        return `${this.translate('agent.dashboard.approvals', { count: this.approvals.length }, `approvals ${this.approvals.length}`)} · ${selectedIndex + 1}/${this.approvals.length}`;
    }

    get approvalsTitleLabel(): string {
        if (!this.shouldShow || !this.approvals.length) {
            return '';
        }
        return this.state.selectedApproval
            ? this.translate('agent.approval.allowPrompt', { tool: this.state.selectedApproval.toolName }, `Approval required · Allow ${this.state.selectedApproval.toolName}?`)
            : this.translate('agent.approval.required', undefined, 'Approval required');
    }

    get approvalsHintLabel(): string {
        if (!this.shouldShow || !this.approvals.length || !this.state.approvalsFocused) {
            return '';
        }
        return this.state.consoleOptions.approvalsHint;
    }

    get approvalActionsLabel(): string {
        if (!this.shouldShow || !this.approvals.length) {
            return '';
        }
        return this.translate('agent.approval.actions', undefined, '↑↓ Move   y Copy   Esc Deny');
    }

    get selectedApprovalRequestLabel(): string {
        if (!this.shouldShow || !this.state.selectedApproval) {
            return '';
        }
        const request = this.state.selectedApproval;
        const input = formatAgentConsoleApprovalInput(request.toolName, request.inputSummary || request.summary);
        return input ? this.summarize(input) : '';
    }

    get accessibilityLabel(): string {
        if (!this.shouldShow) {
            return this.translate('agent.approval.accessibilityTitle', undefined, 'Approvals');
        }
        const selected = this.state.selectedApproval;
        return selected
            ? this.translate('agent.approval.accessibilitySelected', { count: this.approvals.length, tool: selected.toolName }, `Approvals. ${this.approvals.length} pending. Selected: ${selected.toolName}.`)
            : this.translate('agent.approval.accessibility', { count: this.approvals.length }, `Approvals. ${this.approvals.length} pending.`);
    }

    get selectedApprovalDetailLabel(): string {
        if (!this.shouldShow || !this.state.selectedApproval) {
            return '';
        }
        const request = this.state.selectedApproval;
        const detailKey = request.reasonDetail?.code ? `agent.approval.reasonCode.${request.reasonDetail.code}` : '';
        const localizedReason = detailKey ? this.translator?.translate(detailKey, request.reasonDetail?.params) : undefined;
        const reason = localizedReason && localizedReason !== detailKey ? localizedReason : (request.reason || this.translate('agent.approval.noReason', undefined, 'No reason provided'));
        const lines = [this.translate('agent.approval.reason', { reason }, `Reason: ${reason}`)];
        if (request.expiresAt && request.timeoutMs > 0) {
            const remainingMs = request.expiresAt - Date.now();
            const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
            lines.push(remainingMs > 0
                ? this.translate('agent.approval.expiresIn', { seconds }, `Expires in ${seconds}s`)
                : this.translate('agent.approval.expired', undefined, 'Expired'));
        }
        return lines.join('\n');
    }

    get shouldShow(): boolean {
        return this.state.approvalsFocused;
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > this.state.consoleOptions.toolRunSummaryMaxLength
            ? `${text.slice(0, this.state.consoleOptions.toolRunSummaryMaxLength)}...`
            : text;
    }
}

