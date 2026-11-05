import type { AgentOptions } from '@tsdi/agent';
import type { ConsoleTerminalSurfaceAccessor } from './console-ports';
import type { AgentConsoleSettingsData } from './AgentConsoleSettingsStore';
import type { AgentConsoleStatuslineField, AgentConsoleStatuslineStore } from './AgentConsoleStatusline';
import type { AgentConsoleTitleField, AgentConsoleTitleStore } from './AgentConsoleTitle';
import { formatAgentUiLabel, formatAgentUiNotice } from './agent-ui.i18n';
import { AgentConsoleIntegrationHost } from './AgentConsoleIntegrationHost';
import { EffortLevel, setModelReasoningEffort } from './AgentConsoleModelHandlers';
import {
    openSettingsGeneralTab as openSettingsGeneralTabView,
    openSettingsKeybindsTab,
    openSettingsLanguage as openSettingsLanguageView,
    openSettingsProvidersTab as openSettingsProvidersTabView,
    runDisplayCommand,
    runLayoutCommand,
    runSettingsCommand as runSettingsCommandView,
    runTimelineModeCommand
} from './AgentConsoleSettingsCommands';
import {
    runFastCommand,
    runRawModeCommand,
    runStatuslineCommand,
    runThemeCommand,
    runTitleCommand
} from './AgentConsoleRuntimeCommands';
import {
    resolveProjectMemoryId as resolveProjectMemoryIdView,
    runDebugConfigCommand as runDebugConfigCommandView,
    runHooksCommand as runHooksCommandView,
    runMemoriesCommand as runMemoriesCommandView,
    runPersonalityCommand as runPersonalityCommandView
} from './AgentConsolePreferenceCommands';
import { runQueueCommand as runQueueCommandView } from './AgentConsoleRpcCommands';
import { runStashCommand as runStashCommandView } from './AgentConsoleStashCommands';
import {
    preferenceCommandHost,
    rpcCommandHost,
    runtimeHost,
    settingsPanelHost,
    stashCommandHost
} from './AgentConsoleHostFactories';

/** Settings, preferences, display and title/statusline command projections. */
export abstract class AgentConsoleSettingsHost extends AgentConsoleIntegrationHost {
    protected abstract options: AgentOptions;
    protected abstract surfaceAccessor?: ConsoleTerminalSurfaceAccessor | null;
    protected abstract statuslineStore?: AgentConsoleStatuslineStore | null;
    protected abstract titleStore?: AgentConsoleTitleStore | null;
    abstract get workspace(): string;
    protected yoloMode = false;
    protected modelReasoningEffort: EffortLevel = 'medium';
    protected lastTerminalTitle = '';
    protected abstract persistSettings(patch: Partial<AgentConsoleSettingsData>): Promise<void>;
    protected abstract resolveHistoryWorkspace(): string;
    protected abstract setModelReasoningEffort(next: EffortLevel): Promise<void>;
    protected abstract runKeymapCommand(args: string): Promise<void>;
    protected abstract get resolvedApprovalManager(): any;

    protected async runThemeCommand(args?: string): Promise<boolean> {
        return runThemeCommand(runtimeHost(this), args);
    }

    protected async runThinkingCommand(args?: string): Promise<boolean> {
        const requested = String(args || '').trim().toLowerCase();
        if (requested === 'on' || requested === 'show') {
            this.state.setShowThinking(true);
        } else if (requested === 'off' || requested === 'hide') {
            this.state.setShowThinking(false);
        } else {
            this.state.setShowThinking(!this.state.showThinking);
        }
        this.notify(this.state.showThinking ? formatAgentUiNotice(this.translator, 'showingReasoningMessages') : formatAgentUiNotice(this.translator, 'hidingReasoningMessages'));
        return true;
    }

    protected async runRawModeCommand(args?: string): Promise<boolean> {
        return runRawModeCommand(runtimeHost(this), args);
    }

    protected async runStashCommand(args?: string): Promise<boolean> {
        return runStashCommandView(stashCommandHost(this), args);
    }

    protected async runQueueCommand(args?: string): Promise<boolean> {
        return runQueueCommandView(rpcCommandHost(this), args);
    }

    protected async runTitleCommand(args?: string): Promise<boolean> {
        return runTitleCommand(runtimeHost(this), args);
    }

    protected async applyTitleFields(fields: AgentConsoleTitleField[]): Promise<boolean> {
        this.state.setTitleFields(fields);
        this.updateTerminalTitle();
        try {
            await this.titleStore?.save(this.resolveHistoryWorkspace(), fields);
        } catch (error: any) {
            this.notify(error?.message || formatAgentUiNotice(this.translator, 'windowTitleSaveFailed'));
            return true;
        }
        this.notify(fields.length ? formatAgentUiNotice(this.translator, 'windowTitleSet', { fields: fields.join(', ') }) : formatAgentUiNotice(this.translator, 'windowTitleCleared'));
        return true;
    }

    protected updateTerminalTitle(): void {
        if (this.options.ui?.terminalTitle === false) {
            return;
        }
        const title = this.state.formatTerminalTitle();
        if (!title || title === this.lastTerminalTitle) {
            return;
        }
        this.lastTerminalTitle = title;
        this.surfaceAccessor?.writeRawTerminalData?.(`\x1b]0;${title}\x07`);
        const doc = (globalThis as { document?: { title: string } }).document;
        if (doc) {
            doc.title = title;
        }
    }

    protected async runStatuslineCommand(args?: string): Promise<boolean> {
        return runStatuslineCommand(runtimeHost(this), args);
    }

    protected async applyStatusline(fields: AgentConsoleStatuslineField[]): Promise<boolean> {
        this.state.setStatusline(fields);
        try {
            await this.statuslineStore?.save(this.resolveHistoryWorkspace(), fields);
        } catch (error: any) {
            this.notify(error?.message || formatAgentUiNotice(this.translator, 'statuslineSaveFailed'));
            return true;
        }
        this.notify(fields.length ? formatAgentUiNotice(this.translator, 'statuslineSet', { fields: fields.join(', ') }) : formatAgentUiNotice(this.translator, 'statuslineCleared'));
        return true;
    }

    protected async resolveGitBranch(): Promise<void> {
        const workspace = this.workspace;
        if (!workspace) return;
        const fileAdapter = this.resolveFileAdapter();
        if (!fileAdapter) return;
        try {
            const headPath = fileAdapter.join(workspace, '.git', 'HEAD');
            if (!fileAdapter.existsSync(headPath)) {
                this.state.setGitBranch('');
                this.updateTerminalTitle();
                return;
            }
            const head = fileAdapter.readTextSync(headPath).trim();
            const match = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
            this.state.setGitBranch(match ? match[1] : head.slice(0, 7));
            this.updateTerminalTitle();
        } catch {
            this.state.setGitBranch('');
            this.updateTerminalTitle();
        }
    }

    protected async runHooksCommand(): Promise<boolean> {
        return runHooksCommandView(preferenceCommandHost(this));
    }

    protected async runMemoriesCommand(args?: string): Promise<boolean> {
        return runMemoriesCommandView(preferenceCommandHost(this), args);
    }

    protected resolveProjectMemoryId(): string {
        return resolveProjectMemoryIdView(preferenceCommandHost(this));
    }

    protected async runFastCommand(args?: string): Promise<boolean> {
        return runFastCommand(runtimeHost(this), args);
    }

    protected async runPersonalityCommand(args?: string): Promise<boolean> {
        return runPersonalityCommandView(preferenceCommandHost(this), args);
    }

    protected async runDebugConfigCommand(): Promise<boolean> {
        return runDebugConfigCommandView(preferenceCommandHost(this));
    }

    protected async runSettingsCommand(): Promise<boolean> {
        return runSettingsCommandView(settingsPanelHost(this));
    }

    protected async openSettingsGeneralTab(): Promise<boolean> {
        return openSettingsGeneralTabView(settingsPanelHost(this));
    }

    protected async setYoloMode(enabled: boolean, notify = true): Promise<void> {
        this.yoloMode = enabled; this.state.setYoloMode(enabled);
        if (this.state.securityLevel === 'ask' || this.state.securityLevel === 'auto') {
            this.state.securityLevel = enabled ? 'auto' : 'ask';
        }
        (this.resolvedApprovalManager as any)?.setAutoApprove?.(enabled);
        this.options.tools = { ...(this.options.tools || {}), autoApprove: enabled } as any;
        await this.persistSettings({ yoloMode: enabled });
        if (notify) this.notify(enabled ? formatAgentUiNotice(this.translator, 'yoloModeEnabled') : formatAgentUiNotice(this.translator, 'yoloModeDisabled'));
    }

    protected async runYoloCommand(args?: string): Promise<boolean> {
        const value = String(args || '').trim().toLowerCase();
        if (value && value !== 'on' && value !== 'off') {
            this.notify(formatAgentUiNotice(this.translator, 'yoloUsage'));
            return true;
        }
        await this.setYoloMode(value ? value === 'on' : !this.yoloMode);
        return true;
    }

    protected async openSettingsLanguage(): Promise<boolean> {
        return openSettingsLanguageView(settingsPanelHost(this));
    }

    protected async openSettingsKeybindsTab(): Promise<boolean> {
        return openSettingsKeybindsTab(
            (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            (args: string) => this.runKeymapCommand(args), this.translator
        );
    }

    protected async openSettingsProvidersTab(): Promise<boolean> {
        return openSettingsProvidersTabView(settingsPanelHost(this));
    }

    protected async openSettingsThinkingLevel(): Promise<boolean> {
        const tiers: EffortLevel[] = ['low', 'medium', 'high', 'max'];
        const selected = await this.select(formatAgentUiLabel(this.translator, 'agent.menu.settings.thinkingLevelTitle', 'Settings · Thinking Level'), tiers.map(tier => ({
            label: `${tier === this.modelReasoningEffort ? '● ' : '  '}${tier}`,
            value: tier,
            description: formatAgentUiNotice(this.translator, tier === this.modelReasoningEffort ? 'currentLevel' : 'setReasoningEffort')
        })), Math.max(0, tiers.indexOf(this.modelReasoningEffort)), formatAgentUiLabel(this.translator, 'agent.hint.enterApplyClose', 'enter apply   esc close')) as EffortLevel | undefined;
        if (!selected) return true;
        await this.setModelReasoningEffort(selected);
        return true;
    }

    protected async runDisplayCommand(args?: string): Promise<boolean> {
        return runDisplayCommand(args, this.state, (message: string) => this.notify(message), (patch: Record<string, any>) => this.persistSettings(patch), this.translator);
    }

    protected async runLayoutCommand(args?: string): Promise<boolean> {
        return runLayoutCommand(args, this.state, (message: string) => this.notify(message), (patch: Record<string, any>) => this.persistSettings(patch), this.translator, () => this.surfaceAccessor?.restartRendering?.(), (title, options, index, hint) => this.select(title, options, index, hint));
    }

    protected async runTimelineModeCommand(args?: string): Promise<boolean> {
        return runTimelineModeCommand(args, this.state, (message: string) => this.notify(message), (patch: Record<string, any>) => this.persistSettings(patch), this.translator);
    }
}
