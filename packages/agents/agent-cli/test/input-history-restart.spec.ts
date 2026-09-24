import expect = require('expect');
import * as os from 'os';
import * as path from 'path';
import { PassThrough } from 'stream';
import { Suite, Test } from '@tsdi/unit';
import { ApplicationContext } from '@tsdi/core';
import { ComponentRef } from '@tsdi/components';
import { TuiConsoleModule } from '@tsdi/components/console';
import { AGENT_OPTIONS, AgentHookCommandExecutor, AgentRuntime, MemoryStore, mergeAgentOptions, provideAgentOrmStorage } from '@tsdi/agent';
import { AgentAppServerModule } from '@tsdi/agent-gateway';
import { provideTools } from '@tsdi/agent-tools';
import { AgentConsoleComponent, AgentUiConfigService } from '@tsdi/agent-ui';
import { runAgentTUI } from '@tsdi/agent-ui/console';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import {
    CliAgentUiConfigReader,
    NodeAgentHookCommandExecutor,
    createAgentSandboxRuntimeProvider,
    resolveModelAdapter
} from '../src';

@Suite('Input History Restart Repro')
export class InputHistoryRestartRepro {
    private createFakeTerminalInput(): PassThrough & { isTTY: boolean; readable: boolean; setRawMode(enabled: boolean): void; rawMode: boolean; } {
        const input = new PassThrough() as PassThrough & { isTTY: boolean; readable: boolean; setRawMode(enabled: boolean): void; rawMode: boolean; };
        input.isTTY = true;
        input.readable = true;
        input.rawMode = false;
        input.setRawMode = (enabled: boolean) => {
            input.rawMode = enabled;
        };
        return input;
    }

    private createFakeTerminalOutput(): PassThrough & { isTTY: boolean; columns: number; rows: number; } {
        const output = new PassThrough() as PassThrough & { isTTY: boolean; columns: number; rows: number; };
        output.isTTY = true;
        output.columns = 120;
        output.rows = 40;
        return output;
    }

    private async createRoot(): Promise<string> {
        const fs = await import('fs');
        return fs.promises.mkdtemp(path.join(os.tmpdir(), 'agent-cli-repro-'));
    }

    private async withHome<T>(home: string, work: () => Promise<T>): Promise<T> {
        const originalHome = process.env.HOME;
        process.env.HOME = home;
        try {
            return await work();
        } finally {
            process.env.HOME = originalHome;
        }
    }

    private async withPatchedProcessStdio<T>(
        input: PassThrough,
        output: PassThrough,
        work: () => Promise<T>
    ): Promise<T> {
        const stdinDescriptor = Object.getOwnPropertyDescriptor(process, 'stdin');
        const stdoutDescriptor = Object.getOwnPropertyDescriptor(process, 'stdout');
        Object.defineProperty(process, 'stdin', {
            configurable: true,
            value: input
        });
        Object.defineProperty(process, 'stdout', {
            configurable: true,
            value: output
        });
        try {
            return await work();
        } finally {
            if (stdinDescriptor) {
                Object.defineProperty(process, 'stdin', stdinDescriptor);
            }
            if (stdoutDescriptor) {
                Object.defineProperty(process, 'stdout', stdoutDescriptor);
            }
        }
    }

    private async waitFor(predicate: () => boolean | Promise<boolean>, timeoutMs = 8000): Promise<void> {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
            if (await predicate()) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 20));
        }
        throw new Error(`Timed out after ${timeoutMs}ms`);
    }

    private async bootSimulatedChat(
        options: { workspace: string; root?: string }
    ): Promise<{
        ctx: ApplicationContext;
        component: AgentConsoleComponent;
        input: PassThrough & { rawMode: boolean };
        close(): Promise<void>;
    }> {
        const input = this.createFakeTerminalInput();
        const output = this.createFakeTerminalOutput();
        let ctx!: ApplicationContext;
        await this.withPatchedProcessStdio(input, output, async () => {
            const cliOptions = {
                workspace: options.workspace,
                provider: 'echo',
                model: 'echo',
                ...(options.root ? { root: options.root } : {})
            };
            const config = new AgentUiConfigService(new CliAgentUiConfigReader(), cliOptions);
            const resolved = config.resolve(cliOptions);
            const modelConfig = resolved.model;
            const runtimeAgentOptions = mergeAgentOptions({
                hooks: resolved.hooks,
                model: {
                    provider: modelConfig.provider,
                    model: modelConfig.model,
                    baseUrl: modelConfig.baseUrl,
                    apiKey: modelConfig.apiKey,
                    apiKeyEnv: modelConfig.apiKeyEnv,
                    timeoutMs: modelConfig.timeoutMs,
                    temperature: modelConfig.temperature,
                    maxTokens: modelConfig.maxTokens,
                    headers: modelConfig.headers,
                    thinkingBudget: modelConfig.thinkingBudget,
                    reasoning: modelConfig.reasoning,
                    defaultProfile: modelConfig.defaultProfile,
                    profiles: modelConfig.profiles,
                    routes: modelConfig.routes,
                    complexityRouting: modelConfig.complexityRouting,
                    complexityThresholds: modelConfig.complexityThresholds
                },
                ui: {
                    console: {
                        workspace: resolved.workspace
                    }
                }
            });

            ctx = await runAgentTUI(AgentConsoleComponent, {
                consoleModule: TuiConsoleModule,
                agentOptions: runtimeAgentOptions,
                deps: [ServerCommonModule, AgentAppServerModule],
                providers: [
                    ...provideAgentOrmStorage(resolved.root),
                    ...provideTools(resolved.tools),
                    createAgentSandboxRuntimeProvider(),
                    resolveModelAdapter(config, cliOptions),
                    NodeAgentHookCommandExecutor,
                    { provide: AgentHookCommandExecutor, useExisting: NodeAgentHookCommandExecutor },
                    { provide: AgentUiConfigService, useValue: config },
                    { provide: AGENT_OPTIONS, useValue: runtimeAgentOptions }
                ]
            });
            await ctx.get(AgentRuntime).start();
        });

        const component = (ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>).instance;
        await this.waitFor(() => component.sessionState.workspace === options.workspace && !!component.sessionState.sessionId);

        return {
            ctx,
            component,
            input,
            close: async () => {
                await this.withPatchedProcessStdio(input, output, async () => {
                    await ctx.close();
                });
                input.destroy();
                output.destroy();
            }
        };
    }

    @Test('recalls workspace input history across TUI restarts via real ORM store')
    async recallsWorkspaceInputHistoryAcrossTuiRestarts() {
        const fs = await import('fs');
        const root = await this.createRoot();
        const workspace = path.resolve(root, 'workspace');

        await this.withHome(root, async () => {
            // boot 1: real TUI, real ORM store, submit a prompt
            const first = await this.bootSimulatedChat({ workspace, root });
            try {
                await this.waitFor(() => !!first.component.sessionState.sessionId);
                first.component.sessionState.setInput('persist-me', 10);
                await first.component.submit();
                await this.waitFor(() =>
                    first.component.sessionState.getInputHistoryEntries().includes('persist-me')
                );
            } finally {
                await first.close();
            }

            // boot 2: same root + HOME, history should restore
            const second = await this.bootSimulatedChat({ workspace, root });
            try {
                await this.waitFor(() =>
                    second.component.sessionState.getInputHistoryEntries().includes('persist-me')
                );
                // Press ArrowUp through stdin so decoding, surface wiring and
                // component dispatch are covered as they are in the real TUI.
                second.input.write('\u001b[A');
                await this.waitFor(() => second.component.sessionState.input === 'persist-me');
            } finally {
                await second.close();
            }
        });

        // ensure the sqljs db was actually touched
        const dbPath = path.join(root, '.tsdi-agent', 'agent.db');
        expect(fs.existsSync(dbPath)).toBe(true);
    }

    @Test('recovers project history from session messages when the input-history cache is missing')
    async recoversProjectHistoryWithoutInputHistoryCache() {
        const root = await this.createRoot();
        const workspace = path.resolve(root, 'workspace');

        await this.withHome(root, async () => {
            const first = await this.bootSimulatedChat({ workspace, root });
            try {
                first.component.sessionState.setInput('recover-from-session', 20);
                await first.component.submit();
                await this.waitFor(() => first.component.sessionState.messages
                    .some(message => message.role === 'user' && message.content === 'recover-from-session'));

                const memory = first.ctx.get(MemoryStore);
                const historyRecords = (await memory.getAll(undefined))
                    .filter(record => record.key === 'agent-ui.console.input-history');
                expect(historyRecords.length).toBeGreaterThan(0);
                for (const record of historyRecords) {
                    await memory.delete(record.id, undefined, 'global');
                }
                expect((await memory.getAll(undefined))
                    .filter(record => record.key === 'agent-ui.console.input-history')).toEqual([]);
            } finally {
                await first.close();
            }

            const second = await this.bootSimulatedChat({ workspace, root });
            try {
                await this.waitFor(() => second.component.sessionState
                    .getInputHistoryEntries().includes('recover-from-session'));
                second.input.write('\u001b[A');
                await this.waitFor(() => second.component.sessionState.input === 'recover-from-session');
                second.input.write('\u001b[B');
                await this.waitFor(() => second.component.sessionState.input === '');
            } finally {
                await second.close();
            }
        });
    }

    @Test('does not recall input history from another workspace')
    async isolatesInputHistoryByWorkspace() {
        const root = await this.createRoot();
        const workspaceA = path.resolve(root, 'workspace-a');
        const workspaceB = path.resolve(root, 'workspace-b');

        await this.withHome(root, async () => {
            const first = await this.bootSimulatedChat({ workspace: workspaceA, root });
            try {
                first.component.sessionState.setInput('workspace-a-only', 16);
                await first.component.submit();
                await this.waitFor(() => first.component.sessionState
                    .getInputHistoryEntries().includes('workspace-a-only'));
            } finally {
                await first.close();
            }

            const second = await this.bootSimulatedChat({ workspace: workspaceB, root });
            try {
                expect(second.component.sessionState.getInputHistoryEntries()).not.toContain('workspace-a-only');
                second.input.write('\u001b[A');
                await new Promise(resolve => setTimeout(resolve, 50));
                expect(second.component.sessionState.input).toBe('');
            } finally {
                await second.close();
            }
        });
    }
}
