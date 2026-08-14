import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PassThrough } from 'stream';
import { Suite, Test } from '@tsdi/unit';
import { ApplicationContext } from '@tsdi/core';
import { ComponentRef } from '@tsdi/components';
import { TuiConsoleModule } from '@tsdi/components/console';
import { MemoryStore, SessionStore, AGENT_OPTIONS, AgentHookCommandExecutor, AgentRuntime, mergeAgentOptions, provideAgentOrmStorage } from '@tsdi/agent';
import { AgentAppServerModule } from '@tsdi/agent-gateway';
import { provideTools } from '@tsdi/agent-tools';
import { AgentConsoleComponent, AgentUiConfigService, runAgentUi } from '@tsdi/agent-ui';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import {
    CliAgentUiConfigReader,
    createAgentDoctorReport,
    createAgentCli,
    createAgentDesktopLaunchPlan,
    createAgentUpdatePlan,
    generateAgentCompletionScript,
    ensureAgentWorkspaceConfig,
    formatProjectListLine,
    formatAgentDoctorReport,
    formatAgentUpdatePlan,
    formatProjectSessionsHeader,
    resolveCliConfig,
    resolveCliHooks,
    resolveCliModelConfig,
    resolveCompletionShell,
    resolveAgentUpdateManager,
    resolveAgentUpdateRegistry,
    resolveAgentUpdateStatus,
    resolveProjectDisplayLabel,
    sortProjectSessions,
    resolveProviderApiKeyEnv,
    resolveProviderProfile,
    resolveProviderRegistry,
    normalizeCliArgv,
    parseImportSources,
    runAgentJsonStream,
    runAgentImport,
    runAgentDoctor,
    runAgentDesktop,
    runAgentPrompt,
    runAgentRpcApplication,
    runAgentUpdate,
    NodeAgentHookCommandExecutor,
    createAgentSandboxRuntimeProvider,
    resolveModelAdapter,
    withAdapterProviders,
    runAgentRpcStdio,
    writeProviderProfile,
    writeSettingsModelProfile
} from '../src';

@Suite('Agent CLI')
export class AgentCliTest {
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

    private createFakeTerminalOutput(): PassThrough & { isTTY: boolean; columns: number; rows: number; rendered: string; } {
        const output = new PassThrough() as PassThrough & { isTTY: boolean; columns: number; rows: number; rendered: string; };
        output.isTTY = true;
        output.columns = 120;
        output.rows = 40;
        output.rendered = '';
        output.on('data', chunk => {
            output.rendered += String(chunk);
        });
        return output;
    }

    private async createRoot(): Promise<string> {
        return fs.promises.mkdtemp(path.join(os.tmpdir(), 'agent-cli-root-'));
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
        options: {
            workspace: string;
            provider?: string;
            model?: string;
            root?: string;
        }
    ): Promise<{
        ctx: ApplicationContext;
        component: AgentConsoleComponent;
        input: PassThrough & { rawMode: boolean };
        output: PassThrough & { rendered: string };
        close(): Promise<void>;
    }> {
        const input = this.createFakeTerminalInput();
        const output = this.createFakeTerminalOutput();
        let ctx!: ApplicationContext;
        await this.withPatchedProcessStdio(input, output, async () => {
            const cliOptions = {
                workspace: options.workspace,
                provider: options.provider || 'echo',
                model: options.model || 'echo',
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

            ctx = await runAgentUi(AgentConsoleComponent, {
                consoleModule: TuiConsoleModule,
                agentOptions: runtimeAgentOptions,
                deps: [ServerCommonModule, AgentAppServerModule],
                providers: [
                    ...provideAgentOrmStorage(resolved.root),
                    ...provideTools(resolved.tools),
                    ...withAdapterProviders(cliOptions),
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
            output,
            close: async () => {
                await this.withPatchedProcessStdio(input, output, async () => {
                    await ctx.close();
                });
                input.destroy();
                output.destroy();
            }
        };
    }

    private pngFixture(): Buffer {
        return Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z4uoAAAAASUVORK5CYII=',
            'base64'
        );
    }

    @Test('resolves cli config for tools and channels')
    async resolvesCliConfig() {
        const root = await this.createRoot();
        const resolved = resolveCliConfig({
            root,
            session: 's1',
            tools: 'filesystem,http_fetch',
            channels: 'local,wechat',
            defaultTools: false,
            defaultChannels: false
        });
        expect(resolved.sessionId).toBe('s1');
        expect(resolved.workspace).toBe(path.resolve(root, 'workspace'));
        expect(resolved.tools.file?.rootDir).toBe(path.resolve(root, 'workspace'));
        expect(resolved.tools.registration?.preset).toBe('none');
        expect((resolved.tools.registration?.groups as any).filesystem).toBe(true);
        expect((resolved.tools.registration?.items as any).http_fetch).toBe(true);
        expect((resolved.tools.registration?.groups as any).http_fetch).toBe(undefined);
        expect(resolved.channels.registration?.preset).toBe('none');
        expect((resolved.channels.registration?.groups as any).local).toBe(true);
        expect((resolved.channels.registration?.items as any).wechat).toBe(true);
        expect((resolved.channels.registration?.groups as any).wechat).toBe(undefined);
        expect(resolved.channels.defaultChannel).toBe('local');
    }

    @Test('resolves workspace skill roots and tools root from settings as configuration only')
    async resolvesWorkspaceSkillRootsAndToolsRootFromSettingsAsConfigurationOnly() {
        const root = await this.createRoot();
        const settingsPath = path.join(root, 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify({
            session: 's-from-settings',
            workspace: 'custom-workspace',
            tools: {
                root: 'tools'
            },
            skills: {
                roots: ['skills', 'custom-skills']
            },
            channels: {
                values: ['local'],
                defaultEnabled: false
            }
        }), 'utf8');
        const resolved = resolveCliConfig({ root });
        expect(resolved.sessionId).toBe('s-from-settings');
        expect(resolved.root).toBe(path.resolve(root));
        expect(resolved.settingsPath).toBe(settingsPath);
        expect(resolved.workspace).toBe(path.resolve(root, 'custom-workspace'));
        expect(resolved.tools.file?.rootDir).toBe(path.resolve(root, 'custom-workspace', 'tools'));
        expect(resolved.tools.roots).toEqual([
            path.resolve(root, 'custom-workspace', 'tools')
        ]);
        expect(resolved.skillRoots).toEqual([
            path.resolve(root, 'custom-workspace', 'skills'),
            path.resolve(root, 'custom-workspace', 'custom-skills')
        ]);
        expect(resolved.channels.registration?.preset).toBe('none');
        expect(resolved.channels.defaultChannel).toBe('local');
    }

    @Test('resolves lifecycle hooks from hooks.json')
    async resolvesLifecycleHooksFromHooksJson() {
        const root = await this.createRoot();
        fs.writeFileSync(path.join(root, 'hooks.json'), JSON.stringify({
            beforeTurn: { command: 'echo before-turn' },
            afterTool: [{ command: 'echo after-tool' }]
        }), 'utf8');

        const hooks = resolveCliHooks(root);
        const resolved = resolveCliConfig({ root });

        expect(hooks).toEqual({
            beforeTurn: { command: 'echo before-turn' },
            afterTool: [{ command: 'echo after-tool' }]
        });
        expect(resolved.hooks).toEqual(hooks);
    }

    @Test('resolves ssh hosts and allowlist from settings')
    async resolvesSshHostsFromSettings() {
        const root = await this.createRoot();
        fs.writeFileSync(path.join(root, 'settings.json'), JSON.stringify({
            ssh: {
                hosts: {
                    web: {
                        host: 'example.com',
                        username: 'root',
                        auth: { type: 'key', keyPath: '~/.ssh/id_ed25519' }
                    },
                    db: {
                        host: 'db.internal',
                        port: 2222,
                        auth: { type: 'password', passwordEnv: 'DB_SSH_PASSWORD' }
                    }
                },
                allowlist: ['web', 'db.internal:2222']
            }
        }), 'utf8');

        const resolved = resolveCliConfig({ root });

        expect(resolved.ssh).toEqual({
            hosts: {
                web: {
                    host: 'example.com',
                    username: 'root',
                    auth: { type: 'key', keyPath: '~/.ssh/id_ed25519' }
                },
                db: {
                    host: 'db.internal',
                    port: 2222,
                    auth: { type: 'password', passwordEnv: 'DB_SSH_PASSWORD' }
                }
            },
            allowlist: ['web', 'db.internal:2222']
        });
    }

    @Test('resolves without ssh config when settings has no ssh section')
    async resolvesWithoutSshConfigWhenAbsent() {
        const root = await this.createRoot();
        fs.writeFileSync(path.join(root, 'settings.json'), JSON.stringify({
            session: 'plain'
        }), 'utf8');

        const resolved = resolveCliConfig({ root });

        expect(resolved.ssh).toBeUndefined();
    }

    @Test('defaults workspace to launch git root')
    async defaultsWorkspaceToLaunchGitRoot() {
        const home = await this.createRoot();
        const launchDir = path.join(home, 'projects', 'agent-cli');
        fs.mkdirSync(path.join(home, 'projects', '.git'), { recursive: true });
        fs.mkdirSync(launchDir, { recursive: true });
        const originalHome = process.env.HOME;
        const originalCwd = process.cwd();
        process.env.HOME = home;
        process.chdir(launchDir);
        try {
            const resolved = resolveCliConfig({});
            expect(resolved.root).toBe(path.resolve(home, '.tsdi-agent'));
            expect(resolved.settingsPath).toBe(path.resolve(home, '.tsdi-agent', 'settings.json'));
            expect(resolved.workspace).toBe(path.join(home, 'projects'));
            expect(resolved.tools.file?.rootDir).toBe(path.join(home, 'projects'));
        } finally {
            process.env.HOME = originalHome;
            process.chdir(originalCwd);
        }
    }

    @Test('falls back to launch directory when no git root exists')
    async fallsBackToLaunchDirectoryWhenNoGitRootExists() {
        const home = await this.createRoot();
        const launchDir = path.join(home, 'plain', 'agent-cli');
        fs.mkdirSync(launchDir, { recursive: true });
        const originalHome = process.env.HOME;
        const originalCwd = process.cwd();
        const originalExistsSync = fs.existsSync;
        process.env.HOME = home;
        process.chdir(launchDir);
        (fs as any).existsSync = (target: string) => String(target).endsWith(`${path.sep}.git`)
            ? false
            : originalExistsSync(target);
        try {
            const resolved = resolveCliConfig({});
            expect(resolved.root).toBe(path.resolve(home, '.tsdi-agent'));
            expect(resolved.settingsPath).toBe(path.resolve(home, '.tsdi-agent', 'settings.json'));
            expect(resolved.workspace).toBe(launchDir);
            expect(resolved.tools.file?.rootDir).toBe(launchDir);
        } finally {
            (fs as any).existsSync = originalExistsSync;
            process.env.HOME = originalHome;
            process.chdir(originalCwd);
        }
    }

    @Test('creates cli commands with run, chat and rpc-stdio subcommands')
    createsCliCommands() {
        const cli = createAgentCli();
        const commandNames = cli.commands.map(cmd => cmd.name());
        const toolsCommand = cli.commands.find(cmd => cmd.name() === 'tools');
        expect(commandNames.includes('run')).toBe(true);
        expect(commandNames.includes('chat')).toBe(true);
        expect(commandNames.includes('doctor')).toBe(true);
        expect(commandNames.includes('harness')).toBe(true);
        expect(commandNames.includes('completion')).toBe(true);
        expect(commandNames.includes('update')).toBe(true);
        expect(commandNames.includes('rpc-stdio')).toBe(true);
        expect(commandNames.includes('tools')).toBe(true);
        expect(commandNames.includes('import')).toBe(true);
        expect(toolsCommand?.commands.map(cmd => cmd.name())).toEqual(['list']);
        expect(cli.args.length).toBe(0);
    }

    @Test('import is registered as a top-level command')
    importRegisteredAsTopLevelCommand() {
        const cli = createAgentCli();
        const importCommand = cli.commands.find(cmd => cmd.name() === 'import');
        expect(importCommand).toBeTruthy();
        expect(importCommand?.description).toBeTruthy();
    }

    @Test('desktop command is registered with app alias')
    desktopCommandRegistered() {
        const command = createAgentCli().commands.find(item => item.name() === 'desktop');
        expect(command).toBeTruthy();
        expect(command?.aliases()).toContain('app');
    }

    @Test('desktop launch plan hands off session without exposing token in argv')
    async desktopLaunchPlanAndRunner() {
        const root = await this.createRoot();
        const launched: any[] = [];
        let unref = 0;
        const launcher = {
            resolve: (id: string) => id === 'electron/cli.js' ? '/electron/cli.js' : '/desktop/main.js',
            launch: (command: string, args: string[], options: any) => {
                launched.push({ command, args, options });
                return { unref: () => { unref++; } };
            }
        };
        const options = { root, session: 'handoff-session', workspace: root, gatewayUrl: 'https://gateway.example/', token: 'secret-token' };
        const plan = createAgentDesktopLaunchPlan(options, launcher);
        expect(plan.gatewayUrl).toBe('https://gateway.example');
        expect(plan.sessionId).toBe('handoff-session');
        expect(plan.args).toEqual(['/electron/cli.js', '/desktop/main.js']);
        expect(plan.args.join(' ')).not.toContain('secret-token');
        expect(plan.env.TSDI_AGENT_TOKEN).toBe('secret-token');
        await runAgentDesktop(options, launcher);
        expect(launched[0].options.detached).toBe(true);
        expect(launched[0].options.stdio).toBe('ignore');
        expect(unref).toBe(1);
    }

    @Test('normalizeCliArgv reorders leading options before import command')
    normalizeCliArgvReordersLeadingOptionsBeforeImport() {
        const argv = normalizeCliArgv([
            'node',
            'tsdi-agent.js',
            '--apply',
            'import',
            '--sources',
            'claude-md,cursor-rules'
        ]);
        expect(argv).toEqual([
            'node',
            'tsdi-agent.js',
            'import',
            '--apply',
            '--sources',
            'claude-md,cursor-rules'
        ]);
    }

    @Test('import command rejects unknown sources')
    async importCommandRejectsUnknownSources() {
        let error: Error | undefined;
        try {
            await runAgentImport({ sources: 'claude-md,unknown' });
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('Unknown import source');
    }

    @Test('import command accepts user metadata and ecosystem sources')
    importCommandAcceptsExpandedSources() {
        expect(parseImportSources('claude-user,cursor-user,ecosystem')).toEqual(['claude-user', 'cursor-user', 'ecosystem']);
    }

    @Test('import command applies claude-md guidance into AGENTS.md')
    async importCommandAppliesClaudeMdIntoAgentsMd() {
        const root = await this.createRoot();
        await fs.promises.writeFile(
            path.join(root, 'CLAUDE.md'),
            '# Claude Code\n\nAlways use functional components.\n',
            'utf8'
        );
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });

        const result = await runAgentImport({ workspace: root, apply: true }, { stdout: output });

        expect(result.mode).toBe('apply');
        expect(result.summary.applied).toBeGreaterThanOrEqual(1);
        const agentsMd = await fs.promises.readFile(path.join(root, 'AGENTS.md'), 'utf8');
        expect(agentsMd).toContain('## Imported from CLAUDE.md');
        expect(agentsMd).toContain('Always use functional components.');
        expect(agentsMd).toContain('<!-- imported-from:claude.md -->');
        expect(agentsMd).toContain('<!-- /imported-from:claude.md -->');
        expect(agentsMd.split('## Imported from CLAUDE.md').length).toBe(2);
        expect(buffer).toContain('Migration applied');
    }

    @Test('import command re-apply is idempotent')
    async importCommandReapplyIsIdempotent() {
        const root = await this.createRoot();
        await fs.promises.writeFile(
            path.join(root, 'CLAUDE.md'),
            '# Claude Code\n\nAlways use functional components.\n',
            'utf8'
        );
        const output = new PassThrough();
        output.on('data', () => { });

        const first = await runAgentImport({ workspace: root, apply: true }, { stdout: output });
        const agentsMd = await fs.promises.readFile(path.join(root, 'AGENTS.md'), 'utf8');
        const second = await runAgentImport({ workspace: root, apply: true }, { stdout: output });
        const agentsMdAfter = await fs.promises.readFile(path.join(root, 'AGENTS.md'), 'utf8');

        expect(first.summary.applied).toBeGreaterThanOrEqual(1);
        expect(second.summary.noChange).toBeGreaterThanOrEqual(1);
        expect(agentsMdAfter).toBe(agentsMd);
        expect(agentsMdAfter.split('## Imported from CLAUDE.md').length).toBe(2);
        expect(agentsMdAfter.split('<!-- imported-from:claude.md -->').length).toBe(2);
    }

    @Test('completion script includes nested commands and options')
    completionScriptIncludesNestedCommandsAndOptions() {
        const cli = createAgentCli();
        const script = generateAgentCompletionScript('bash', cli);
        expect(script).toContain('completion');
        expect(script).toContain('doctor');
        expect(script).toContain('project');
        expect(script).toContain('sessions');
        expect(script).toContain('--workspace');
        expect(script).toContain('--provider');
        expect(script).toContain('bash zsh fish');
    }

    @Test('resolves completion shell from explicit value and shell env')
    resolvesCompletionShellFromExplicitValueAndShellEnv() {
        expect(resolveCompletionShell('fish')).toBe('fish');
        expect(resolveCompletionShell(undefined, { SHELL: '/bin/zsh' } as NodeJS.ProcessEnv)).toBe('zsh');
        expect(resolveCompletionShell(undefined, {} as NodeJS.ProcessEnv)).toBe('bash');
    }

    @Test('builds update plan with package manager specific command')
    buildsUpdatePlanWithPackageManagerSpecificCommand() {
        const plan = createAgentUpdatePlan({
            manager: 'pnpm',
            target: 'next'
        });

        expect(plan.manager).toBe('pnpm');
        expect(plan.target).toBe('next');
        expect(plan.argv).toEqual(['add', '-g', '@tsdi/agent-cli@next']);
        expect(plan.command).toBe('pnpm add -g @tsdi/agent-cli@next');
        expect(formatAgentUpdatePlan(plan)).toContain('Run with --yes');
    }

    @Test('resolves update manager from user agent and defaults to npm')
    resolvesUpdateManagerFromUserAgentAndDefaultsToNpm() {
        expect(resolveAgentUpdateManager(undefined, {
            npm_config_user_agent: 'yarn/4.9.1 npm/? node/v22.0.0'
        } as NodeJS.ProcessEnv)).toBe('yarn');
        expect(resolveAgentUpdateManager(undefined, {} as NodeJS.ProcessEnv)).toBe('npm');
    }

    @Test('resolves update registry from option env and default')
    resolvesUpdateRegistryFromOptionEnvAndDefault() {
        expect(resolveAgentUpdateRegistry('https://mirror.example.com/', {} as NodeJS.ProcessEnv)).toBe('https://mirror.example.com');
        expect(resolveAgentUpdateRegistry(undefined, {
            npm_config_registry: 'https://registry.npmmirror.com/'
        } as NodeJS.ProcessEnv)).toBe('https://registry.npmmirror.com');
        expect(resolveAgentUpdateRegistry(undefined, {} as NodeJS.ProcessEnv)).toBe('https://registry.npmjs.org');
    }

    @Test('update command emits json plan without executing by default')
    async updateCommandEmitsJsonPlanWithoutExecutingByDefault() {
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });

        let invoked = false;
        const plan = await runAgentUpdate({
            manager: 'bun',
            target: 'latest',
            json: true
        }, {
            stdout: output,
            runner: async () => {
                invoked = true;
                return 0;
            }
        });

        const payload = JSON.parse(buffer.trim());
        expect(plan.manager).toBe('bun');
        expect(payload.manager).toBe('bun');
        expect(payload.command).toBe('bun add -g @tsdi/agent-cli@latest');
        expect(invoked).toBe(false);
    }

    @Test('update check reads latest version from registry metadata')
    async updateCheckReadsLatestVersionFromRegistryMetadata() {
        const plan = await runAgentUpdate({
            check: true,
            target: 'latest',
            registry: 'https://registry.npmjs.org'
        }, {
            stdout: new PassThrough(),
            metadataFetcher: async () => ({
                'dist-tags': {
                    latest: '6.0.99',
                    next: '6.1.0-beta.1'
                }
            })
        });

        expect(plan.registry).toBe('https://registry.npmjs.org');
        expect(plan.latestVersion).toBe('6.0.99');
        expect(plan.updateAvailable).toBe(true);
        expect(plan.status).toBe('update_available');
    }

    @Test('update check skips install when current version is already latest')
    async updateCheckSkipsInstallWhenCurrentVersionIsAlreadyLatest() {
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });
        let invoked = false;

        const plan = await runAgentUpdate({
            check: true,
            yes: true
        }, {
            stdout: output,
            metadataFetcher: async () => ({
                'dist-tags': {
                    latest: '6.0.31'
                }
            }),
            runner: async () => {
                invoked = true;
                return 0;
            }
        });

        expect(plan.updateAvailable).toBe(false);
        expect(invoked).toBe(false);
        expect(buffer).toContain('Already up to date; skipping install.');
        expect(plan.status).toBe('up_to_date');
    }

    @Test('update status compares semantic versions and prerelease ordering')
    updateStatusComparesSemanticVersionsAndPrereleaseOrdering() {
        expect(resolveAgentUpdateStatus('6.0.31', '6.0.32')).toBe('update_available');
        expect(resolveAgentUpdateStatus('6.0.31', '6.0.31')).toBe('up_to_date');
        expect(resolveAgentUpdateStatus('6.1.0-beta.2', '6.1.0-beta.1')).toBe('current_newer_than_target');
        expect(resolveAgentUpdateStatus('6.1.0', '6.1.0-beta.3')).toBe('current_newer_than_target');
        expect(resolveAgentUpdateStatus('6.0.31', null)).toBe('target_not_found');
    }

    @Test('update check skips install when checked target is missing')
    async updateCheckSkipsInstallWhenCheckedTargetIsMissing() {
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });
        let invoked = false;

        const plan = await runAgentUpdate({
            check: true,
            target: 'missing-tag',
            yes: true
        }, {
            stdout: output,
            metadataFetcher: async () => ({
                'dist-tags': {
                    latest: '6.0.31'
                }
            }),
            runner: async () => {
                invoked = true;
                return 0;
            }
        });

        expect(plan.status).toBe('target_not_found');
        expect(plan.updateAvailable).toBe(false);
        expect(invoked).toBe(false);
        expect(buffer).toContain('Checked target was not found in the registry metadata; skipping install.');
    }

    @Test('doctor report surfaces missing workspace and missing api key')
    async doctorReportSurfacesMissingWorkspaceAndApiKey() {
        const root = await this.createRoot();
        const report = createAgentDoctorReport({
            root,
            provider: 'openai',
            model: 'gpt-5-mini'
        });

        expect(report.provider).toBe('openai');
        expect(report.model).toBe('gpt-5-mini');
        expect(report.apiKeyConfigured).toBe(false);
        expect(report.pathEntries.find(entry => entry.label === 'workspace')?.exists).toBe(false);
        expect(report.issues.some(issue => issue.code === 'workspace_missing')).toBe(true);
        expect(report.issues.some(issue => issue.code === 'api_key_missing')).toBe(true);
        expect(report.credentialStore.encrypted).toBe(true);
        expect(report.credentialStore.backend).toBe('local-aes-256-gcm');
        expect(report.issues.some(issue => issue.code === 'credential_store_fallback')).toBe(true);
        expect(formatAgentDoctorReport(report)).toContain('Issues:');
        expect(formatAgentDoctorReport(report)).toContain('Credential store: local-aes-256-gcm');
    }

    @Test('doctor command emits json output')
    async doctorCommandEmitsJsonOutput() {
        const root = await this.createRoot();
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });

        const report = await runAgentDoctor({
            root,
            provider: 'echo',
            model: 'echo',
            json: true
        }, { stdout: output });

        const payload = JSON.parse(buffer.trim());
        expect(report.provider).toBe('echo');
        expect(payload.provider).toBe('echo');
        expect(payload.model).toBe('echo');
        expect(Array.isArray(payload.pathEntries)).toBe(true);
    }

    @Test('formats project list lines with project and thread labels')
    formatsProjectListLines() {
        expect(resolveProjectDisplayLabel({
            projectId: 'exam-system',
            focusSummary: 'Latest summary',
            primaryThreadId: 'thread-1',
            workspace: '/tmp/project-a',
            projectKey: 'project:exam-system'
        } as any)).toBe('exam-system');

        expect(resolveProjectDisplayLabel({
            focusSummary: 'Investigate flaky worker startup',
            primaryThreadId: 'thread-9',
            workspace: '/tmp/project-a',
            projectKey: 'thread:thread-9'
        } as any)).toBe('Investigate flaky worker startup');

        expect(formatProjectListLine({
            projectKey: 'thread:thread-9',
            focusSummary: 'Investigate flaky worker startup',
            primaryThreadId: 'thread-9',
            workspace: '',
            sessionIds: ['s1', 's2'],
            lastActiveAt: 1
        } as any)).toContain('Investigate flaky worker startup  [thread:thread-9]');
    }

    @Test('formats project sessions header with stable project label')
    formatsProjectSessionsHeader() {
        expect(formatProjectSessionsHeader({
            projectKey: 'project:exam-system',
            projectId: 'exam-system',
            focusSummary: 'Latest summary',
            workspace: '/tmp/project-a'
        } as any)).toBe('Project: exam-system  [project:exam-system]  |  workspace /tmp/project-a');
    }

    @Test('sorts project sessions by latest activity then id')
    sortsProjectSessionsByLatestActivityThenId() {
        expect(sortProjectSessions([
            { id: 'chat-b', updatedAt: 10 },
            { id: 'chat-a', updatedAt: 10 },
            { id: 'chat-c', updatedAt: 20 }
        ])).toEqual([
            { id: 'chat-c', updatedAt: 20 },
            { id: 'chat-a', updatedAt: 10 },
            { id: 'chat-b', updatedAt: 10 }
        ]);
    }

    @Test('normalizes option-only argv to chat command')
    normalizesOptionOnlyArgvToChatCommand() {
        const argv = normalizeCliArgv([
            'node',
            'tsdi-agent.js',
            '--workspace',
            '/tmp/project',
            '--provider',
            'echo'
        ]);

        expect(argv).toEqual([
            'node',
            'tsdi-agent.js',
            'chat',
            '--workspace',
            '/tmp/project',
            '--provider',
            'echo'
        ]);
    }

    @Test('moves explicit subcommands ahead of leading options')
    movesExplicitSubcommandsAheadOfLeadingOptions() {
        const argv = normalizeCliArgv([
            'node',
            'tsdi-agent.js',
            '--workspace',
            '/tmp/project',
            'run',
            'hello'
        ]);

        expect(argv).toEqual([
            'node',
            'tsdi-agent.js',
            'run',
            '--workspace',
            '/tmp/project',
            'hello'
        ]);
    }

    @Test('normalizes doctor command ahead of leading options')
    normalizesDoctorCommandAheadOfLeadingOptions() {
        const argv = normalizeCliArgv([
            'node',
            'tsdi-agent.js',
            '--root',
            '/tmp/agent-root',
            'doctor',
            '--json'
        ]);

        expect(argv).toEqual([
            'node',
            'tsdi-agent.js',
            'doctor',
            '--root',
            '/tmp/agent-root',
            '--json'
        ]);
    }

    @Test('normalizes completion command ahead of leading options')
    normalizesCompletionCommandAheadOfLeadingOptions() {
        const argv = normalizeCliArgv([
            'node',
            'tsdi-agent.js',
            '--root',
            '/tmp/agent-root',
            'completion',
            'fish'
        ]);

        expect(argv).toEqual([
            'node',
            'tsdi-agent.js',
            'completion',
            '--root',
            '/tmp/agent-root',
            'fish'
        ]);
    }

    @Test('normalizes update command ahead of leading options')
    normalizesUpdateCommandAheadOfLeadingOptions() {
        const argv = normalizeCliArgv([
            'node',
            'tsdi-agent.js',
            '--manager',
            'pnpm',
            '--registry',
            'https://registry.example.com',
            'update',
            '--json'
        ]);

        expect(argv).toEqual([
            'node',
            'tsdi-agent.js',
            'update',
            '--manager',
            'pnpm',
            '--registry',
            'https://registry.example.com',
            '--json'
        ]);
    }

    @Test('normalizes harness command ahead of leading options')
    normalizesHarnessCommandAheadOfLeadingOptions() {
        const argv = normalizeCliArgv([
            'node',
            'tsdi-agent.js',
            '--root',
            '/tmp/agent-root',
            'harness',
            'audit',
            '--session',
            's1'
        ]);

        expect(argv).toEqual([
            'node',
            'tsdi-agent.js',
            'harness',
            '--root',
            '/tmp/agent-root',
            'audit',
            '--session',
            's1'
        ]);
    }

    @Test('formats harness audit report lines')
    formatsHarnessAuditReportLines() {
        const { formatHarnessAuditReport } = require('../src/harness-command');
        const text = formatHarnessAuditReport({
            scopedSessionIds: ['session-abcdefghijklmnopqrstuvwxyz'],
            totalTurns: 2,
            totalToolAttempts: 5,
            failureTurnRate: 50,
            topFailingTools: [{ toolName: 'terminal', attempts: 3, failures: 2, failureRate: 66.7, falsifiedCount: 1 }],
            errorClusters: [{ signature: 'ECONNREFUSED', count: 2, toolNames: ['terminal'], suggestedPolicy: 'review sandbox.networkAllowlist' }],
            falsifiedDistribution: [{ toolName: 'terminal', falsifiedCount: 1, falsifiedRate: 33.3 }],
            suggestions: [{ kind: 'approval', toolName: 'terminal', message: 'gate it' }]
        });
        expect(text).toContain('Harness failure-pattern audit');
        expect(text).toContain('session-abcdef…');
        expect(text).toContain('terminal: 2/3 (66.7%)');
        expect(text).toContain('ECONNREFUSED: x2');
        expect(text).toContain('[approval] terminal');
    }

    @Test('formats harness profile list and current views')
    formatsHarnessProfileViews() {
        const { formatHarnessProfileList, formatHarnessProfileCurrent } = require('../src/harness-command');
        const listText = formatHarnessProfileList(
            [
                { name: 'default', version: 1, requireApproval: ['shell.exec'], maxRepairRounds: 3, sandbox: { mode: 'workspace' }, granularCategories: ['sandbox'] },
                { name: 'strict', version: 1, requireApproval: ['shell.exec', { category: 'network', mode: 'ask' }], maxRepairRounds: 1, maxLoopRecoveries: 2, sandbox: { mode: 'network-block' }, granularCategories: ['sandbox', 'network'] }
            ],
            'strict'
        );
        expect(listText).toContain('Harness profiles');
        expect(listText).toContain('* strict');
        expect(listText).toContain('approval rules 2');
        expect(listText).toContain("Active reference: 'strict'");

        const currentText = formatHarnessProfileCurrent(
            {
                name: 'strict',
                version: 1,
                requireApproval: ['shell.exec', { category: 'network', mode: 'ask' }],
                sandbox: { mode: 'network-block', networkAllowlist: ['registry.npmjs.org'] },
                maxRepairRounds: 1,
                maxLoopRecoveries: 2,
                verificationWriteTools: ['write_file', 'edit_file']
            },
            'strict'
        );
        expect(currentText).toContain('Harness profile strict');
        expect(currentText).toContain('network [ask]');
        expect(currentText).toContain('registry.npmjs.org');
        expect(currentText).toContain('Max repair rounds: 1');

        expect(formatHarnessProfileCurrent(null)).toContain('No harness profile resolved.');
    }

    @Test('formats harness profile diff lines')
    formatsHarnessProfileDiff() {
        const { formatHarnessProfileDiff } = require('../src/harness-command');
        const text = formatHarnessProfileDiff('default', 'strict', ['maxRepairRounds: 3 → 1', 'sandbox: workspace → network-block']);
        expect(text).toContain('default -> strict');
        expect(text).toContain('maxRepairRounds: 3 → 1');

        const empty = formatHarnessProfileDiff('default', 'default', []);
        expect(empty).toContain('(no differences)');
    }

    @Test('formats the suggested harness profile patch view')
    formatsHarnessProfilePatchView() {
        const { formatHarnessProfilePatchView } = require('../src/harness-command');
        const text = formatHarnessProfilePatchView(
            { name: 'default', version: 1, requireApproval: ['terminal'], maxRepairRounds: 2, sandbox: { mode: 'network-block' } },
            ['sandbox: workspace → network-block', 'requireApproval: [shell.exec] → [shell.exec, terminal]']
        );
        expect(text).toContain('Suggested harness profile patch:');
        expect(text).toContain('sandbox: workspace → network-block');
        expect(text).toContain('approval rules 1');
        expect(text).toContain('sandbox network-block');

        const none = formatHarnessProfilePatchView(
            { name: 'default', version: 1 },
            []
        );
        expect(none).toContain('no governance changes implied');
    }

    @Test('uses persistent session and memory stores across cli app restarts')
    async usesPersistentStoresAcrossCliRestarts() {
        const root = await this.createRoot();
        await this.withHome(root, async () => {
            const first = await runAgentRpcApplication({
                root,
                provider: 'echo',
                model: 'echo'
            });

            try {
                const sessions = first.get(SessionStore) as SessionStore;
                const memory = first.get(MemoryStore) as MemoryStore;
                await sessions.append('persisted-session', { id: '1', role: 'user', content: 'hello', createdAt: 1 } as any);
                await memory.put({
                    id: 'mem-1',
                    key: 'agent-ui.console.input-history',
                    value: JSON.stringify(['hello']),
                    scope: 'global',
                    metadata: { workspace: '/tmp/workspace', principalId: 'local-system', kind: 'console-input-history' },
                    createdAt: 1,
                    updatedAt: 1
                } as any);
            } finally {
                await first.close();
            }

            const second = await runAgentRpcApplication({
                root,
                provider: 'echo',
                model: 'echo'
            });

            try {
                const sessions = second.get(SessionStore) as SessionStore;
                const memory = second.get(MemoryStore) as MemoryStore;
                const state = await sessions.get('persisted-session');
                const records = await memory.getAll('persisted-session');
                expect(state.messages.map((message: any) => message.content)).toEqual(['hello']);
                expect(records.some((record: any) => record.key === 'agent-ui.console.input-history')).toBe(true);
            } finally {
                await second.close();
            }
        });
    }

    @Test('runs shared rpc stdio server through cli entrypoint')
    async runsSharedRpcStdioServerThroughCliEntrypoint() {
        const input = new PassThrough();
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });
        const root = await this.createRoot();
        await this.withHome(root, async () => {
            const running = runAgentRpcStdio({
                provider: 'echo',
                model: 'echo'
            }, {
                input,
                output
            });

            input.write('{"jsonrpc":"2.0","id":1,"method":"app.ping"}\n');
            input.end();
            await running;

            const response = JSON.parse(buffer.trim());
            expect(response.jsonrpc).toBe('2.0');
            expect(response.id).toBe(1);
            expect(response.result.ok).toBe(true);
        });
    }

    @Test('package main and bin entries point to runnable files')
    packageEntrypointsExist() {
        const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
        expect(fs.existsSync(path.resolve(__dirname, '..', pkg.main))).toBe(true);
        expect(fs.existsSync(path.resolve(__dirname, '..', pkg.bin['tsdi-agent']))).toBe(true);
    }

    @Test('rejects API call without configured key')
    async rejectsApiCallWithoutKey() {
        const root = await this.createRoot();
        await this.withHome(root, async () => {
            try {
                await runAgentPrompt('test', { root, session: 'no-key' });
                expect(false).toBe(true);
            } catch (error: any) {
                expect(error.message).toContain('API key');
            }
        });
    }

    @Test('runs a prompt with echo provider without external API configuration')
    async runsPromptWithEchoProvider() {
        const root = await this.createRoot();
        await this.withHome(root, async () => {
            const output = await runAgentPrompt('hello agent', {
                root,
                session: 'echo-run',
                provider: 'echo',
                model: 'echo'
            });
            expect(output).toContain('Echo: hello agent');
        });
    }

    @Test('run --image persists structured image parts on the user message')
    async runPromptWithImageAttachment() {
        const root = await this.createRoot();
        const workspace = path.join(root, 'workspace');
        await fs.promises.mkdir(workspace, { recursive: true });
        const imagePath = path.join(workspace, 'cat.png');
        await fs.promises.writeFile(imagePath, this.pngFixture());
        await this.withHome(root, async () => {
            const output = await runAgentPrompt('describe the image', {
                root,
                session: 'echo-image',
                workspace,
                provider: 'echo',
                model: 'echo',
                image: [imagePath]
            });
            expect(output).toContain('Echo: describe the image');

            const ctx = await runAgentRpcApplication({ root, workspace }, {});
            try {
                const session = await ctx.get(SessionStore).get('echo-image');
                expect(session.messages[0].content).toBe('describe the image');
                expect(session.messages[0].parts?.[0]).toEqual({ type: 'text', text: 'describe the image' });
                expect(session.messages[0].parts?.[1]?.type).toBe('image');
                expect(String(session.messages[0].parts?.[1]?.imageUrl || '')).toContain('data:image/png;base64,');
            } finally {
                await ctx.close();
            }
        });
    }

    @Test('runs a prompt with json event stream output')
    async runsPromptWithJsonEventStream() {
        const root = await this.createRoot();
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });
        await this.withHome(root, async () => {
            await runAgentJsonStream('hello agent', {
                root,
                session: 'echo-json',
                provider: 'echo',
                model: 'echo',
                json: true
            }, { output });

            const events = buffer.trim().split('\n').map(line => JSON.parse(line));
            expect(events[0].type).toBe('thread.started');
            expect(events.some(event => event.type === 'turn.started')).toBe(true);
            expect(events.some(event => event.type === 'item.text.delta' && String(event.delta || '').includes('Echo: hello agent'))).toBe(true);
            const completed = events.find(event => event.type === 'turn.completed');
            expect(completed).toBeTruthy();
            expect(completed.message.content).toContain('Echo: hello agent');
            expect(events[events.length - 1].type).toBe('thread.completed');
        });
    }

    @Test('json event stream can append output-last-message compatibility event')
    async jsonEventStreamAppendsLastMessageCompatibilityEvent() {
        const root = await this.createRoot();
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });
        await this.withHome(root, async () => {
            await runAgentJsonStream('hello again', {
                root,
                session: 'echo-json-last',
                provider: 'echo',
                model: 'echo',
                json: true,
                outputLastMessage: true
            }, { output });

            const events = buffer.trim().split('\n').map(line => JSON.parse(line));
            const tail = events.find(event => event.type === 'output.last_message');
            expect(tail).toBeTruthy();
            expect(tail.content).toContain('Echo: hello again');
        });
    }

    @Test('accepts tool item names without treating them as groups')
    async acceptsToolItemNamesWithoutTreatingThemAsGroups() {
        const root = await this.createRoot();
        const resolved = resolveCliConfig({ root, tools: 'http_fetch' });
        expect((resolved.tools.registration?.items as any).http_fetch).toBe(true);
        expect((resolved.tools.registration?.groups as any).http_fetch).toBe(undefined);
    }

    @Test('workspace from CLI options overrides settings workspace')
    async workspaceFromCliOverridesSettings() {
        const root = await this.createRoot();
        const settingsPath = path.join(root, 'settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify({
            workspace: 'from-settings'
        }), 'utf8');
        const resolved = resolveCliConfig({ root, workspace: '/custom/workspace' });
        expect(resolved.workspace).toBe('/custom/workspace');
        expect(resolved.tools.file?.rootDir).toBe('/custom/workspace');
    }

    @Test('writes default workspace settings and provider profile')
    async writesDefaultWorkspaceSettingsAndProviderProfile() {
        const root = await this.createRoot();
        const settingsPath = ensureAgentWorkspaceConfig(root);
        const providerPath = writeSettingsModelProfile(root, {
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            apiKey: 'test-key',
            baseUrl: 'https://api.deepseek.com',
            timeoutMs: 120000
        });

        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        const profile = JSON.parse(fs.readFileSync(providerPath, 'utf8'));

        expect(settings.workspace).toBe('workspace');
        expect(profile.model.provider).toBe('deepseek');
        expect(profile.model.model).toBe('deepseek-v4-flash');
    }

    @Test('strips legacy apiKeyEnv fields when writing settings profiles')
    async stripsLegacyApiKeyEnvFieldsWhenWritingSettingsProfiles() {
        const root = await this.createRoot();
        const settingsPath = writeSettingsModelProfile(root, {
            provider: 'openai-compatible',
            model: 'redhus',
            apiKey: 'test-key',
            apiKeyEnv: 'OPENAI_API_KEY',
            profiles: {
                flash: {
                    provider: 'openai-compatible',
                    model: 'redhus',
                    apiKeyEnv: 'OPENAI_API_KEY'
                } as any
            }
        });

        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        expect(settings.model.apiKey).toBe(undefined);
        expect(settings.model.apiKeyEnv).toBe(undefined);
        expect(settings.model.profiles.flash.apiKeyEnv).toBe(undefined);
        expect(resolveCliModelConfig({ root }, root).apiKey).toBe('test-key');
    }

    @Test('ignores recoverable workspace settings write errors')
    async ignoresRecoverableWorkspaceSettingsWriteErrors() {
        const root = await this.createRoot();
        const originalWriteFileSync = fs.writeFileSync;
        (fs as any).writeFileSync = () => {
            const error: NodeJS.ErrnoException = new Error('read-only');
            error.code = 'EROFS';
            throw error;
        };
        try {
            expect(() => ensureAgentWorkspaceConfig(root)).not.toThrow();
            expect(() => writeSettingsModelProfile(root, {
                provider: 'openai-compatible',
                model: 'gpt-5.4'
            })).not.toThrow();
            expect(() => writeProviderProfile(root, {
                provider: 'openai-compatible',
                model: 'gpt-5.4'
            })).not.toThrow();
        } finally {
            (fs as any).writeFileSync = originalWriteFileSync;
        }
    }

    @Test('resolves cli model config from persisted provider profile')
    async resolvesCliModelConfigFromPersistedProfile() {
        const root = await this.createRoot();
        writeProviderProfile(root, {
            provider: 'openai',
            model: 'gpt-4o-mini',
            apiKey: 'openai-key',
            baseUrl: 'https://api.openai.com',
            timeoutMs: 90000
        });

        const profile = resolveProviderProfile(root);
        const modelConfig = resolveCliModelConfig({}, root);

        expect(profile?.provider).toBe('openai');
        expect(modelConfig.provider).toBe('openai');
        expect(modelConfig.model).toBe('gpt-4o-mini');
        expect(modelConfig.apiKey).toBe('openai-key');
    }

    @Test('resolves provider api key env defaults by provider')
    resolvesProviderApiKeyEnvDefaults() {
        expect(resolveProviderApiKeyEnv('deepseek')).toBe('DEEPSEEK_API_KEY');
        expect(resolveProviderApiKeyEnv('openai')).toBe('OPENAI_API_KEY');
        expect(resolveProviderApiKeyEnv('openai-compatible')).toBe('OPENAI_API_KEY');
        expect(resolveProviderApiKeyEnv('anthropic')).toBe('ANTHROPIC_API_KEY');
    }

    @Test('provider registry loads custom provider.json catalog and infers config')
    async providerRegistryLoadsCustomCatalog() {
        const root = await this.createRoot();
        await fs.promises.writeFile(path.join(root, 'provider.json'), JSON.stringify({ providers: { local: { baseUrl: 'http://localhost:11434/v1', apiKeyEnv: 'LOCAL_API_KEY', models: ['coder'] } } }));
        const registry = resolveProviderRegistry(root);
        expect(registry.get('local')?.models.map(model => model.id)).toEqual(['coder']);
        expect(registry.completeConfig({ provider: 'local', model: 'coder' }).baseUrl).toEqual('http://localhost:11434/v1');
        expect(registry.get('openai')).toBeTruthy();
    }

    @Test('provider defaults switch with provider instead of reusing previous provider model')
    providerDefaultsSwitchWithProvider() {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-cli-provider-defaults-'));
        writeSettingsModelProfile(root, {
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            baseUrl: 'https://api.deepseek.com',
            apiKey: 'deepseek-key',
            timeoutMs: 120000
        });

        const deepseek = resolveCliModelConfig({}, root);
        const openaiCompatible = resolveCliModelConfig({
            provider: 'openai-compatible',
            model: 'custom-model'
        }, root);

        expect(deepseek.model).toBe('deepseek-v4-flash');
        expect(openaiCompatible.provider).toBe('openai-compatible');
        expect(openaiCompatible.model).toBe('custom-model');
    }

    @Test('resolves cli model config from provider env when persisted api key missing')
    async resolvesCliModelConfigFromProviderEnv() {
        const root = await this.createRoot();
        writeSettingsModelProfile(root, {
            provider: 'anthropic',
            model: 'claude-sonnet-4-20250514',
            baseUrl: 'https://anthropic-proxy.local',
            timeoutMs: 90000
        });

        const previous = process.env.ANTHROPIC_API_KEY;
        process.env.ANTHROPIC_API_KEY = 'anthropic-env-key';
        try {
            const modelConfig = resolveCliModelConfig({}, root);
            expect(modelConfig.provider).toBe('anthropic');
            expect(modelConfig.model).toBe('claude-sonnet-4-20250514');
            expect(modelConfig.baseUrl).toBe('https://anthropic-proxy.local');
            expect(modelConfig.apiKey).toBe('anthropic-env-key');
            expect(modelConfig.apiKeyEnv).toBe('ANTHROPIC_API_KEY');
        } finally {
            if (previous == null) {
                delete process.env.ANTHROPIC_API_KEY;
            } else {
                process.env.ANTHROPIC_API_KEY = previous;
            }
        }
    }

    @Test('resolves adaptive model config from settings model profiles')
    async resolvesAdaptiveModelConfigFromSettingsProfiles() {
        const root = await this.createRoot();
        writeSettingsModelProfile(root, {
            defaultProfile: 'flash',
            apiKey: 'adaptive-key',
            profiles: {
                flash: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-flash',
                    baseUrl: 'https://api.deepseek.com',
                    apiKeyEnv: 'DEEPSEEK_API_KEY'
                },
                strong: {
                    provider: 'deepseek',
                    model: 'deepseek-v4-pro',
                    baseUrl: 'https://api.deepseek.com',
                    apiKeyEnv: 'DEEPSEEK_API_KEY'
                }
            },
            complexityRouting: {
                simple: 'flash',
                moderate: 'flash',
                complex: 'strong'
            }
        } as any);

        const modelConfig = resolveCliModelConfig({}, root);
        expect(modelConfig.provider).toBe('deepseek');
        expect(modelConfig.model).toBe('deepseek-v4-flash');
        expect(modelConfig.apiKey).toBe('adaptive-key');
        expect(modelConfig.defaultProfile).toBe('flash');
        expect((modelConfig.profiles as any).strong.model).toBe('deepseek-v4-pro');
        expect((modelConfig.complexityRouting as any).complex).toBe('strong');
    }

    @Test('falls back to top-level model config when selected profile contains cancel sentinel values')
    async fallsBackFromCancelledSelectedProfile() {
        const root = await this.createRoot();
        writeSettingsModelProfile(root, {
            provider: 'openai-compatible',
            model: 'gpt-5.4',
            apiKey: 'real-key',
            baseUrl: 'https://rehdasu.cn',
            timeoutMs: 120000,
            defaultProfile: 'flash',
            profiles: {
                flash: {
                    provider: 'openai-compatible',
                    model: 'cancel',
                    apiKey: 'cancel',
                    baseUrl: 'cancel'
                } as any,
                strong: {
                    provider: 'openai-compatible',
                    model: 'gpt-5.5',
                    baseUrl: 'https://rehdasu.cn',
                    reasoning: true
                } as any
            }
        } as any);

        const resolved = resolveCliConfig({ root });
        const modelConfig = resolveCliModelConfig({}, root);
        expect((resolved.settingsModel as any).profiles.flash).toBe(undefined);
        expect((resolved.settingsModel as any).defaultProfile).toBe(undefined);
        expect((resolved.settingsModel as any).complexityRouting?.simple).toBe(undefined);
        expect(modelConfig.provider).toBe('openai-compatible');
        expect(modelConfig.model).toBe('gpt-5.4');
        expect(modelConfig.baseUrl).toBe('https://rehdasu.cn');
        expect(modelConfig.apiKey).toBe('real-key');
    }

}
