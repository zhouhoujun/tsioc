import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PassThrough } from 'stream';
import { Suite, Test } from '@tsdi/unit';
import { MemoryStore, SessionStore } from '@tsdi/agent';
import { NestedAgentRunner } from '@tsdi/agent-tools';
import {
    createAgentCli,
    ensureAgentWorkspaceConfig,
    resolveCliConfig,
    resolveCliModelConfig,
    resolveProviderApiKeyEnv,
    resolveProviderProfile,
    runAgentPrompt,
    runAgentRpcApplication,
    withAdapterProviders,
    runAgentRpcStdio,
    writeProviderProfile,
    writeSettingsModelProfile
} from '../src';

@Suite('Agent CLI')
export class AgentCliTest {
    private async createRoot(): Promise<string> {
        return fs.promises.mkdtemp(path.join(os.tmpdir(), 'agent-cli-root-'));
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
        expect(commandNames.includes('run')).toBe(true);
        expect(commandNames.includes('chat')).toBe(true);
        expect(commandNames.includes('rpc-stdio')).toBe(true);
        const hasToolsCmd = commandNames.some(name => name.startsWith('tools'));
        expect(hasToolsCmd).toBe(true);
        expect(cli.args.length).toBe(0);
    }

    @Test('uses persistent session and memory stores across cli app restarts')
    async usesPersistentStoresAcrossCliRestarts() {
        const root = await this.createRoot();
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
    }

    @Test('runs shared rpc stdio server through cli entrypoint')
    async runsSharedRpcStdioServerThroughCliEntrypoint() {
        const input = new PassThrough();
        const output = new PassThrough();
        let buffer = '';
        output.on('data', chunk => {
            buffer += String(chunk);
        });

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
        try {
            await runAgentPrompt('test', { root, session: 'no-key' });
            expect(false).toBe(true);
        } catch (error: any) {
            expect(error.message).toContain('API key');
        }
    }

    @Test('runs a prompt with echo provider without external API configuration')
    async runsPromptWithEchoProvider() {
        const root = await this.createRoot();
        const output = await runAgentPrompt('hello agent', {
            root,
            session: 'echo-run',
            provider: 'echo',
            model: 'echo'
        });
        expect(output).toContain('Echo: hello agent');
    }

    @Test('nested agent runner executes delegated turn')
    async nestedAgentRunnerExecutesDelegatedTurn() {
        const root = await this.createRoot();
        const adapterProvider = withAdapterProviders({
            root,
            provider: 'echo',
            model: 'echo',
            session: 'parent-session'
        }).find((provider: any) => provider.provide === NestedAgentRunner);
        const adapter = adapterProvider?.useValue as NestedAgentRunner;

        const result = await adapter.run({
            prompt: 'Summarize delegated work with delegated context.'
        });

        expect(result.content).toContain('Summarize delegated work');
        expect(result.content).toContain('delegated context');
        expect(result.turnCount).toBe(1);
        expect(result.model).toBe('echo');
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
        expect(settings.model.apiKey).toBe('test-key');
        expect(settings.model.apiKeyEnv).toBe(undefined);
        expect(settings.model.profiles.flash.apiKeyEnv).toBe(undefined);
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
