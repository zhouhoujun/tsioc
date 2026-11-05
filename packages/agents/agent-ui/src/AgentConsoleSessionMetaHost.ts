import type { ContextPreparationReport, AgentMessage } from '@tsdi/agent';
import type { AgentConsoleContextPreparationSnapshot, AgentConsoleSessionMeta } from './AgentConsoleStateTypes';
import type { AgentConsoleCommandExecutionController } from './AgentConsoleCommandExecutionState';
import type { AgentConsoleStatuslineField } from './AgentConsoleStatusline';
import { defaultAgentConsoleStatusline } from './AgentConsoleStatusline';
import type { AgentConsoleTitleField } from './AgentConsoleTitle';
import { defaultAgentConsoleTitle } from './AgentConsoleTitle';
import { composeAgentConsoleTerminalTitle } from './AgentConsoleTitle';
import { AgentConsoleSessionInputHost } from './AgentConsoleSessionInputHost';

/** Session metadata, project context, digest and mode facade. */
export abstract class AgentConsoleSessionMetaHost extends AgentConsoleSessionInputHost {
    abstract commandExecutionController: AgentConsoleCommandExecutionController;
    abstract refreshInputSuggestions(): void;
    protected abstract formatContextPreparationSummary(report: ContextPreparationReport): string;
    abstract applyLocaleDefaults(locale?: string): void;
    abstract translator?: import('@tsdi/i18n').TranslatorService;

    configure(meta: AgentConsoleSessionMeta): this {
        // The injected translator can gain its final locale after this state is
        // constructed; align labels/hints before the first session renders.
        this.applyLocaleDefaults(this.translator?.currentLocale);
        const nextSessionId = String(meta.sessionId || '').trim();
        if (nextSessionId && nextSessionId !== this.sessionId) {
            this.commandExecutionController.cancelRunning();
            this.sessionId = nextSessionId;
            this.projectKey = '';
            this.projectLabel = '';
            this.projectSummary = '';
            this.projectSessionCount = 0;
            this.contextPreparation = null;
            this.commandExecutions = [];
            this.commandExecutionMessages = [];
            this.commandExchangeSessionEpoch++;
            this.commandOutputs = [];
            // A new session starts its durable replay cursors from the beginning.
            this.timelineTailSeq = -1;
            this.timelineSeedCount = 0;
            this.commandExchangeTailSeq = -1;
            this.commandExchangeSeedCount = 0;
            this.timelineReconnecting = false;
            this.timelineStale = false;
            this.activeTurnEventScope = '';
            void this.loadCommandOutputHistory();
        }
        if (meta.provider !== undefined) {
            this.provider = meta.provider;
        }
        if (meta.model !== undefined) {
            this.model = meta.model;
        }
        if (meta.modelProfile !== undefined) {
            this.modelProfile = meta.modelProfile;
        }
        if (meta.workspace !== undefined) {
            this.workspace = meta.workspace;
        }
        return this;
    }

    setTitle(title: string): void {
        this.title = title;
    }

    setProvider(provider: string): void {
        this.provider = provider;
    }

    setModel(model: string): void {
        this.model = model;
    }

    setWorkspace(workspace: string): void {
        this.workspace = workspace;
        this.refreshInputSuggestions();
    }

    setStatusline(statusline: AgentConsoleStatuslineField[]): void {
        this.statusline = [...(statusline || defaultAgentConsoleStatusline)];
    }

    setTitleFields(titleFields: AgentConsoleTitleField[]): void {
        this.titleFields = [...(titleFields || defaultAgentConsoleTitle)];
    }

    formatTerminalTitle(): string {
        return composeAgentConsoleTerminalTitle(
            {
                projectKey: this.projectKey,
                projectLabel: this.projectLabel,
                workspace: this.workspace,
                status: this.status,
                pendingApprovalCount: this.pendingApprovals.length,
                sessionId: this.sessionId,
                gitBranch: this.gitBranch,
                model: this.model,
                title: this.title
            },
            this.titleFields
        );
    }

    setGitBranch(gitBranch: string): void {
        this.gitBranch = String(gitBranch || '').trim();
    }

    setProjectContext(context?: {
        projectKey?: string;
        projectLabel?: string;
        projectSummary?: string;
        projectSessionCount?: number;
    }): void {
        this.projectKey = String(context?.projectKey || '').trim();
        this.projectLabel = String(context?.projectLabel || '').trim();
        this.projectSummary = String(context?.projectSummary || '').trim();
        this.projectSessionCount = Math.max(0, Number(context?.projectSessionCount || 0));
    }

    setSummaryQualityDigest(digest: string): void {
        this.summaryQualityDigest = String(digest || '').trim();
    }

    setUsageDigest(digest: string): void {
        this.usageDigest = String(digest || '').trim();
    }

    setCompactionDigest(digest: string): void {
        this.compactionDigest = String(digest || '').trim();
    }

    setTurnDiagnosticsDigest(digest: string): void {
        this.turnDiagnosticsDigest = String(digest || '').trim();
    }

    setContextPreparation(report?: ContextPreparationReport | null): void {
        if (!report) {
            this.contextPreparation = null;
            return;
        }
        this.contextPreparation = {
            ...report,
            summary: this.formatContextPreparationSummary(report)
        };
    }

    get contextPreparationSummary(): string {
        return this.contextPreparation?.summary || '';
    }

    get isSshShellActive(): boolean {
        return !!this.sshShell;
    }

    setModelProfile(modelProfile: string): void {
        this.modelProfile = modelProfile;
    }

    setOneShotModelProfile(modelProfile: string): void {
        this.oneShotModelProfile = String(modelProfile || '').trim();
    }

    setPlanMode(enabled: boolean): void { this.planMode = enabled; }
    setYoloMode(enabled: boolean): void { this.yoloMode = enabled; }
}
