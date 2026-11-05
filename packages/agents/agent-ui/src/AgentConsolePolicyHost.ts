import { initAgentsDoc } from '@tsdi/agent';
import { formatAgentUiNotice } from './agent-ui.i18n';
import { AgentConsoleModelHost } from './AgentConsoleModelHost';
import { runPlanCommand as runPlanCommandView } from './AgentConsoleRpcCommands';
import {
    runDelegationModeCommand as runDelegationModeCommandView,
    runPermissionsCommand as runPermissionsCommandView,
    showSandboxCapabilities as showSandboxCapabilitiesView
} from './AgentConsolePolicyCommands';
import { runVimCommand } from './AgentConsoleSettingsCommands';
import {
    resolveKeymapContext as resolveKeymapContextView,
    runKeymapCommand as runKeymapCommandView
} from './AgentConsoleKeymapCommands';
import { detachSshShell, runSshCommand } from './AgentConsoleSshCommands';
import { runCdCommandView } from './AgentConsoleCdCommand';
import { keymapCommandHost, policyCommandHost, rpcCommandHost } from './AgentConsoleHostFactories';
import type { AgentConsoleKeymapContext } from './AgentConsoleKeymap';
import type { AgentConsoleSshHost } from './AgentConsoleSshCommands';

/** Session policy, keymap, SSH and workspace navigation commands. */
export abstract class AgentConsolePolicyHost extends AgentConsoleModelHost {
    protected abstract sshHost(): AgentConsoleSshHost;
    protected abstract persistInputHistory(): Promise<void>;
    protected abstract restoreInputHistory(): Promise<void>;

    protected async runInitCommand(args: string): Promise<void> {
        const force = String(args || '').trim().split(/\s+/).includes('--force');
        try {
            const result = await initAgentsDoc({ force, root: this.workspace || this.options.ui?.console?.workspace, fileAdapter: this.resolveFileAdapter() ?? undefined });
            if (result.created) {
                this.pushCommandOutput('/init', formatAgentUiNotice(this.translator, 'agentsDocCreatedOutput', { file: result.file }));
            } else {
                this.pushCommandOutput('/init', formatAgentUiNotice(this.translator, 'agentsDocStatusOutput', { reason: result.reason }));
            }
        } catch (error) {
            this.notify(formatAgentUiNotice(this.translator, 'failedCreateAgents', { error: error instanceof Error ? error.message : String(error) }));
        }
    }

    protected async runPlanCommand(args: string): Promise<void> {
        return runPlanCommandView(rpcCommandHost(this), args);
    }

    protected async runArchetypeCommand(args: string): Promise<void> {
        const sessionId = this.state.sessionId;
        const name = String(args || '').trim().toLowerCase();
        try {
            if (!name) {
                const current = this.runtime.getSessionArchetype(sessionId);
                const available = this.runtime.listArchetypes().join(', ');
                this.notify(formatAgentUiNotice(this.translator, 'sessionArchetypeAvailable', { current: current, available: available }));
                return;
            }
            if (this.appRpc) {
                await this.appRpc.request('session.archetype.set', { sessionId, archetype: name }, this.rpcRequestContext());
            } else {
                this.runtime.setSessionArchetype(sessionId, name);
            }
            this.notify(formatAgentUiNotice(this.translator, 'sessionSwitchedArchetype', { sessionId: sessionId, name: name }));
        } catch (error) {
            this.notify(formatAgentUiNotice(this.translator, 'failedSetArchetype', { error: error instanceof Error ? error.message : String(error) }));
        }
    }

    protected async runDelegationModeCommand(args: string): Promise<void> {
        return runDelegationModeCommandView(policyCommandHost(this), args);
    }

    protected async runVimCommand(args: string): Promise<void> {
        return runVimCommand(args, this.state, (message: string) => this.notify(message), this.translator);
    }

    protected resolveKeymapContext(): AgentConsoleKeymapContext {
        return resolveKeymapContextView(keymapCommandHost(this));
    }

    protected async runKeymapCommand(args: string): Promise<void> {
        return runKeymapCommandView(keymapCommandHost(this), args);
    }

    protected async runSshCommand(args: string): Promise<void> {
        return runSshCommand(this.sshHost(), args);
    }

    protected async detachSshShell(reason: 'detached' | 'closed'): Promise<void> {
        return detachSshShell(this.sshHost(), reason);
    }

    protected async runPermissionsCommand(args: string): Promise<void> {
        return runPermissionsCommandView(policyCommandHost(this), args);
    }

    protected async showSandboxCapabilities(): Promise<void> {
        return showSandboxCapabilitiesView(policyCommandHost(this));
    }

    protected async runCdCommand(args: string): Promise<void> {
        return runCdCommandView({
            workspace: this.workspace,
            translator: this.translator,
            state: this.state,
            resolveFileAdapter: () => this.resolveFileAdapter(),
            persistInputHistory: () => this.persistInputHistory(),
            restoreInputHistory: () => this.restoreInputHistory(),
            notify: (message: string) => this.notify(message)
        }, args);
    }
}
