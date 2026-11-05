import type { ContextPreparationReport } from '@tsdi/agent';
import type { CommandExecutionControlPort } from '@tsdi/agent';
import type { AgentConsoleCommandExecution } from '@tsdi/agent';
import type { AgentConsoleReviewDiffSection } from './AgentConsoleStateTypes';
import type { AgentConsoleMentionCatalogItem, AgentConsoleWorkspaceMentionResolver } from './AgentConsoleWorkspaceMentions';
import {
    AgentConsoleCommandExecutionController,
    DefaultAgentConsoleCommandExecutionController,
    projectCommandExecutionInState
} from './AgentConsoleCommandExecutionState';
import { formatAgentUiLabel, formatAgentUiNotice } from './agent-ui.i18n';
import {
    parseUnifiedDiffSections as parseUnifiedDiffSectionsInState,
    stringifyReviewContent as stringifyReviewContentInState
} from './AgentConsoleReviewPatch';
import { AgentConsoleSessionTelemetryHost } from './AgentConsoleSessionTelemetryHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';

/** Command execution control and remaining runtime setters. */
export abstract class AgentConsoleSessionRuntimeHost extends AgentConsoleSessionTelemetryHost {
    protected abstract self(): AgentConsoleSessionState;
    protected abstract commandExecutionControl?: CommandExecutionControlPort;
    private _commandExecutionController?: AgentConsoleCommandExecutionController;

    get commandExecutionController(): AgentConsoleCommandExecutionController {
        if (!this._commandExecutionController) {
            this._commandExecutionController = new DefaultAgentConsoleCommandExecutionController(this.self(), {
                begin: (id, session) => this.requireCommandExecutionControl().begin(id, session),
                finish: id => this.requireCommandExecutionControl().finish(id),
                cancel: id => this.requireCommandExecutionControl().cancel(id),
                isCurrent: (id, session) => this.requireCommandExecutionControl().isCurrent(id, session),
                signal: (id, session) => this.requireCommandExecutionControl().signal(id, session)
            });
        }
        return this._commandExecutionController;
    }

    setLastError(message: string): void {
        this.lastError = message;
    }

    setTasksCount(value: number): void {
        this.tasksCount = value;
    }

    get latestCommandExecution(): AgentConsoleCommandExecution | undefined {
        return this.commandExecutions[0];
    }

    setCommandExecutionControl(control: CommandExecutionControlPort): void {
        this.commandExecutionControl = control;
        this._commandExecutionController = undefined;
    }

    protected requireCommandExecutionControl(): CommandExecutionControlPort {
        if (!this.commandExecutionControl) {
            throw new Error(formatAgentUiNotice(undefined, 'sessionStateRequiresCommandExecution'));
        }
        return this.commandExecutionControl;
    }

    projectCommandExecution(requestId: string): void { projectCommandExecutionInState(this.self(), requestId); }

    setCommandHints(commands: string[]): void {
        this.injectedCommandHints = Array.from(new Set(commands.filter(Boolean)));
        this.refreshInputSuggestions();
    }

    setWorkspaceMentionResolver(resolver?: AgentConsoleWorkspaceMentionResolver): void {
        this.workspaceMentionResolver = resolver;
        this.refreshInputSuggestions();
    }

    setMentionCatalog(catalog: AgentConsoleMentionCatalogItem[]): void {
        this.mentionCatalog = catalog.slice();
        this.refreshInputSuggestions();
    }

    setQueuedPromptCount(count: number): void {
        this.queuedPromptCount = Math.max(0, Math.floor(Number(count) || 0));
    }

    setShowThinking(value: boolean): void {
        this.showThinking = !!value;
    }

    setShowTimestamps(value: boolean): void {
        this.showTimestamps = !!value;
    }

    setShowCriticalMarks(value: boolean): void {
        this.showCriticalMarks = !!value;
    }

    setShowToolOutput(value: boolean): void {
        this.showToolOutput = !!value;
    }

    setShowUsername(value: boolean): void {
        this.showUsername = !!value;
    }

    expandTabs(value: string): string {
        return String(value || '').replace(/\t/g, '    ');
    }

    stringifyReviewContent(value: any): string {
        return stringifyReviewContentInState(value);
    }

    parseUnifiedDiffSections(diffText: string): AgentConsoleReviewDiffSection[] {
        return parseUnifiedDiffSectionsInState(diffText);
    }

    protected formatContextPreparationSummary(report: ContextPreparationReport): string {
        const t = (key: string, params: Record<string, any> | undefined, fallback: string) => formatAgentUiLabel(this.translator, key, fallback, params);
        return [
            t('agent.context.strategy', { strategy: report.strategy }, `context ${report.strategy}`),
            t('agent.context.level', { level: report.level }, `level ${report.level}`),
            report.summaryInserted ? t('agent.context.summary', undefined, 'summary') : t('agent.context.noSummary', undefined, 'no summary'),
            t('agent.context.messages', { before: report.beforeMessageCount, after: report.afterMessageCount }, `${report.beforeMessageCount}→${report.afterMessageCount} msgs`),
            t('agent.context.tokens', { before: report.beforeTokens, after: report.afterTokens }, `${report.beforeTokens}→${report.afterTokens} tok`),
            t('agent.context.saved', { ratio: report.compressionRatio }, `${report.compressionRatio}% saved`),
            t('agent.context.retained', { rate: report.retentionRate }, `${report.retentionRate}% retained`),
            report.preservedAnchorCount ? t('agent.context.anchors', { count: report.preservedAnchorCount }, `${report.preservedAnchorCount} anchors`) : '',
            report.toolMessagesCompacted ? t('agent.context.tools', { count: report.toolMessagesCompacted }, `${report.toolMessagesCompacted} tools`) : '',
            report.cumulativeTokenSavings ? t('agent.context.cumulative', { count: report.cumulativeTokenSavings }, `cum ${report.cumulativeTokenSavings} tok`) : ''
        ].filter(Boolean).join(' · ');
    }
}
