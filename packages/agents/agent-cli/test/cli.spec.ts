import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { TuiRenderer } from '@tsdi/components/console';
import { ComponentFactory } from '@tsdi/components';
import { AgentConsoleComponent, AgentConsoleUiDelegate, ModelProfile } from '@tsdi/agent';
import { runAgentApplication } from '../src/run-command';
import {
    createAgentCli,
    applyTerminalInputChunk,
    buildMentionCandidates,
    ensureAgentWorkspaceConfig,
    enrichPromptWithMentions,
    extractMentions,
    formatClockTime,
    getActiveInputToken,
    applySuggestionToInput,
    findSelectMenuOptionIndexFromRenderedLines,
    moveSuggestionSelection,
    normalizeSuggestionState,
    renderActivityLine,
    composeTerminalChatScreen,
    renderDraftLine,
    buildMentionContextLines,
    renderMessagePreview,
    renderAssistantMessageLines,
    renderSelectMenu,
    renderToolDetail,
    renderToolRunLine,
    resolveUniqueCommandPrefix,
    resolveInputSuggestions,
    shouldAcceptSuggestionOnEnter,
    resolveRawKeypressSuppressionKey,
    resolveCliConfig,
    resolveCliModelConfig,
    resolveProviderApiKeyEnv,
    resolveProviderProfile,
    runAgentPrompt,
    parseSlashCommandLine,
    parseTerminalControlKey,
    parseTerminalTextPromptChunk,
    buildChatSessionId,
    buildOsc52ClipboardSequence,
    pickRestoredSessionId,
    shouldPlaceTerminalCursor,
    shouldUseAlternateScreen,
    shouldRouteDraftNavigationKeys,
    shouldSuppressDuplicatedKeypress,
    compactRenderedLines,
    compactRenderedBlocks,
    compactRenderedBlocksWindow,
    windowRenderedLinesFromBottom,
    windowRenderedBlocksFromBottomWithContext,
    sortToolRuns,
    findInputPromptRow,
    getTerminalDisplayWidth,
    highlightCodeLine,
    fitTerminalAnsiLine,
    wrapPrefixedText,
    buildBrandHeaderBlock,
    buildEmptyStateLogoBlock,
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
        const originalHome = process.env.HOME;
        process.env.HOME = home;
        try {
            const resolved = resolveCliConfig({});
            let expectedWorkspace = process.cwd();
            while (!fs.existsSync(path.join(expectedWorkspace, '.git'))) {
                const parent = path.dirname(expectedWorkspace);
                if (parent === expectedWorkspace) {
                    expectedWorkspace = process.cwd();
                    break;
                }
                expectedWorkspace = parent;
            }
            expect(resolved.root).toBe(path.resolve(home, '.tsdi-agent'));
            expect(resolved.settingsPath).toBe(path.resolve(home, '.tsdi-agent', 'settings.json'));
            expect(resolved.workspace).toBe(expectedWorkspace);
            expect(resolved.tools.file?.rootDir).toBe(expectedWorkspace);
        } finally {
            process.env.HOME = originalHome;
        }
    }

    @Test('creates cli commands with run and chat subcommands')
    createsCliCommands() {
        const cli = createAgentCli();
        const commandNames = cli.commands.map(cmd => cmd.name());
        expect(commandNames.includes('run')).toBe(true);
        expect(commandNames.includes('chat')).toBe(true);
        const hasToolsCmd = commandNames.some(name => name.startsWith('tools'));
        expect(hasToolsCmd).toBe(true);
        expect(cli.args.length).toBe(0);
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

    @Test('resolves tui renderer for interactive chat application context')
    async resolvesTuiRendererForInteractiveChat() {
        const root = await this.createRoot();
        writeSettingsModelProfile(root, {
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            apiKey: 'test-key',
            baseUrl: 'https://api.deepseek.com',
            timeoutMs: 120000
        });
        const ctx = await runAgentApplication({ root }, {});
        try {
            expect(ctx.get(TuiRenderer)).toBeTruthy();
            expect(ctx.get(TuiRenderer).constructor.name).toBe('TuiRenderer');
        } finally {
            await ctx.close();
        }
    }

    @Test('injects console ui delegate into agent console component for slash commands')
    async injectsConsoleUiDelegateIntoAgentConsoleComponent() {
        const root = await this.createRoot();
        writeSettingsModelProfile(root, {
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            apiKey: 'test-key',
            baseUrl: 'https://api.deepseek.com',
            timeoutMs: 120000
        });
        class DelegateStub extends AgentConsoleUiDelegate {
            selected = 0;
            quitCalled = 0;

            async select(): Promise<string | undefined> {
                this.selected += 1;
                return undefined;
            }

            async prompt(): Promise<string | undefined> {
                return undefined;
            }

            notify(): void {
                return;
            }

            async copyText(): Promise<boolean> {
                return true;
            }

            async applyModelProfile(_profile: ModelProfile): Promise<void> {
                return;
            }

            quit(): void {
                this.quitCalled += 1;
            }
        }
        const delegate = new DelegateStub();
        const ctx = await runAgentApplication({ root }, {}, [{
            provide: AgentConsoleUiDelegate,
            useValue: delegate
        }]);
        try {
            const factory = ctx.get(ComponentFactory);
            const ref = factory.create(AgentConsoleComponent, { injector: ctx });
            await ref.render();

            ref.instance.input = '/help';
            await ref.instance.submit();
            ref.instance.input = '/exit';
            await ref.instance.submit();

            expect(delegate.selected).toBe(1);
            expect(delegate.quitCalled).toBe(1);
        } finally {
            await ctx.close();
        }
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

    @Test('formats activity and tool run lines with timestamps')
    formatsActivityAndToolRunLines() {
        const time = new Date(2026, 0, 2, 3, 4, 5).getTime();
        expect(formatClockTime(time)).toBe('03:04:05');
        expect(renderActivityLine({
            kind: 'tool',
            message: 'Running read_file',
            createdAt: time
        })).toBe('03:04:05 [tool] Running read_file');
        expect(renderToolRunLine({
            name: 'read_file',
            status: 'success',
            durationMs: 42,
            message: 'Completed',
            updatedAt: time
        })).toBe('03:04:05 [ok ] read_file 42ms Completed');
    }

    @Test('renders select menu with numbered options')
    rendersSelectMenuWithNumberedOptions() {
        expect(renderSelectMenu('Model providers', [
            { label: 'DeepSeek', value: 'deepseek', detail: 'DeepSeek provider' },
            { label: 'OpenAI', value: 'openai', detail: 'OpenAI provider' }
        ], 1)).toEqual([
            'Model providers',
            '',
            '  1. DeepSeek',
            '› 2. OpenAI',
            '',
            '1-9 select   up/down move   enter confirm   q cancel'
        ]);
    }

    @Test('resolves rendered select menu row to option index')
    resolvesRenderedSelectMenuRowToOptionIndex() {
        const rendered = [
            'tsdi-agent',
            'status idle',
            'workspace /tmp/demo',
            '',
            '┌──────────────────────────┐',
            '│ Model providers         │',
            '│ Choose 2 of 2           │',
            '│  1. DeepSeek            │',
            '│ › 2. OpenAI             │',
            '│ Preview                 │',
            '│ openai                  │',
            '└──────────────────────────┘'
        ];

        expect(findSelectMenuOptionIndexFromRenderedLines(rendered, 'Model providers', 2, 8)).toBe(0);
        expect(findSelectMenuOptionIndexFromRenderedLines(rendered, 'Model providers', 2, 9)).toBe(1);
        expect(findSelectMenuOptionIndexFromRenderedLines(rendered, 'Model providers', 2, 10)).toBe(-1);
    }

    @Test('sorts tool runs by status and recency')
    sortsToolRunsByStatusAndRecency() {
        const sorted = sortToolRuns([
            { name: 'c', status: 'success', message: 'done', updatedAt: 1 },
            { name: 'a', status: 'running', message: 'running', updatedAt: 2 },
            { name: 'b', status: 'error', message: 'failed', updatedAt: 3 },
            { name: 'd', status: 'running', message: 'running', updatedAt: 4 }
        ] as any);

        expect(sorted.map(item => item.name)).toEqual(['d', 'a', 'b', 'c']);
    }

    @Test('renders message preview and tool detail blocks')
    rendersMessagePreviewAndToolDetail() {
        expect(renderMessagePreview('assistant', 'line1\nline2', 32)).toEqual([
            'assistant> line1',
            '... line2'
        ]);

        expect(renderToolDetail({
            name: 'read_file',
            status: 'running',
            updatedAt: new Date(2026, 0, 2, 3, 4, 5).getTime(),
            executionMode: 'sequential',
            attemptCount: 1,
            inputSummary: '{"path":"a.txt"}',
            message: 'Running'
        } as any)).toEqual([
            'Name: read_file',
            'Status: running',
            'Updated: 03:04:05',
            'Mode: sequential',
            'Attempts: 1',
            'Input: {"path":"a.txt"}'
        ]);
    }

    @Test('wraps multiline messages and highlights fenced code blocks')
    wrapsMessagesAndHighlightsCodeBlocks() {
        expect(wrapPrefixedText('hello world wide', 10, '› ', '  ')).toEqual([
            '› hello wo',
            '  rld wide'
        ]);

        const rendered = renderAssistantMessageLines('当然，可以。\n```javascript\nconst a = 1\n```', 24);
        expect(rendered[0]).toBe('当然，可以。');
        expect(rendered[1]).toContain('const');
        expect(rendered[1]).toContain('\u001b[');
        expect(rendered.some(line => line.includes('```'))).toBe(false);

        const highlighted = highlightCodeLine('const total = 42', 'javascript');
        expect(highlighted).toContain('\u001b[');
        expect(highlighted).toContain('const');
        expect(highlighted).toContain('42');

        const wrappedCode = renderAssistantMessageLines('```javascript\nconst extremelyLongVariableName = 42\n```', 18);
        expect(wrappedCode.length).toBeGreaterThan(1);
        expect(wrappedCode[0]).toContain('extremelyLon');
        expect(wrappedCode[1]).toContain('42');

        const markdown = renderAssistantMessageLines('# Title\n- **Bold** item with `code`\n> quote [link](https://a.test)', 36);
        expect(markdown[0]).toContain('Title');
        expect(markdown[0]).not.toContain('#');
        expect(markdown[1]).toContain('- ');
        expect(markdown[1]).toContain('Bold');
        expect(markdown.some(line => line.includes('code'))).toBe(true);
        expect(markdown.some(line => line.includes('https://a.test'))).toBe(true);
        expect(markdown.some(line => line.includes('| '))).toBe(true);
        expect(markdown.some(line => line.includes('quote'))).toBe(true);
    }

    @Test('resolves slash and mention suggestions')
    resolvesSlashAndMentionSuggestions() {
        const mentions = buildMentionCandidates(['read_file', 'write_file']);
        expect(getActiveInputToken('/mo')).toBe('/mo');
        expect(resolveUniqueCommandPrefix('/m', ['/help', '/model', '/tools'])).toBe('/model');
        expect(resolveUniqueCommandPrefix('/mo', ['/help', '/model', '/tools'])).toBe('/model');
        expect(resolveUniqueCommandPrefix('/m', ['/model', '/multiline', '/tools'])).toBe('/m');
        expect(resolveUniqueCommandPrefix('/x', ['/help', '/model', '/tools'])).toBe('/x');
        expect(resolveInputSuggestions('/mo', ['/model', '/tools'], mentions)).toEqual([
            { group: 'Commands', label: '/model', value: '/model' }
        ]);
        expect(resolveInputSuggestions('/mes', ['/messages', '/model'], mentions)).toEqual([
            { group: 'Commands', label: '/messages', value: '/messages' }
        ]);
        expect(getActiveInputToken('check @wr')).toBe('@wr');
        expect(resolveInputSuggestions('check @wr', ['/model'], mentions)).toEqual([
            { group: 'Mentions', label: '@write_file', value: '@write_file' }
        ]);
    }

    @Test('extracts and enriches mention context in prompt')
    extractsAndEnrichesMentionContextInPrompt() {
        const mentions = extractMentions('check @workspace and @read_file with @model');
        expect(mentions).toEqual(['@workspace', '@read_file', '@model']);

        const lines = buildMentionContextLines(mentions, {
            workspace: '/tmp/workspace',
            sessionId: 's1',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            tools: [{ name: 'read_file', toolset: 'filesystem', active: true }]
        });
        expect(lines).toEqual([
            'Workspace: /tmp/workspace',
            'Tool read_file: toolset=filesystem, active=yes',
            'Model: deepseek / deepseek-v4-flash'
        ]);

        expect(enrichPromptWithMentions('check @workspace', {
            workspace: '/tmp/workspace',
            sessionId: 's1',
            provider: 'deepseek',
            model: 'deepseek-v4-flash',
            tools: []
        })).toContain('[Mention Context]');
    }

    @Test('moves and applies suggestion selection')
    movesAndAppliesSuggestionSelection() {
        const state = normalizeSuggestionState([
            { group: 'Commands', label: '/help', value: '/help' },
            { group: 'Commands', label: '/model', value: '/model' },
            { group: 'Commands', label: '/tools', value: '/tools' }
        ], 0);
        const moved = moveSuggestionSelection(state, 1);
        expect(moved.selectedIndex).toBe(1);
        expect(moveSuggestionSelection(state, -1).selectedIndex).toBe(2);
        expect(applySuggestionToInput('/mo', '/model')).toBe('/model ');
        expect(applySuggestionToInput('check @wo', '@workspace')).toBe('check @workspace ');
        expect(shouldAcceptSuggestionOnEnter('/mo', moved)).toBe(false);
        expect(shouldAcceptSuggestionOnEnter('check @wo', normalizeSuggestionState([
            { group: 'Mentions', label: '@workspace', value: '@workspace' }
        ], 0))).toBe(true);
        expect(renderDraftLine('run @workspace with @read_file')).toBe('run [@workspace] with [@read_file]');
    }

    @Test('parses slash commands with arguments and builds safe session ids')
    parsesSlashCommandsWithArgumentsAndBuildsSafeSessionIds() {
        expect(parseSlashCommandLine('/session bugfix-thread')).toEqual({
            raw: '/session bugfix-thread',
            command: '/session',
            args: 'bugfix-thread'
        });
        expect(parseSlashCommandLine('plain text')).toEqual({
            raw: 'plain text',
            command: 'plain text',
            args: ''
        });
        expect(buildChatSessionId('feature branch #1')).toBe('feature-branch-1');
        expect(buildChatSessionId('')).toMatch(/^chat-\d{8}-\d{6}$/);
        expect(buildOsc52ClipboardSequence('hello')).toBe('\u001b]52;c;aGVsbG8=\u0007');
    }

    @Test('parses terminal control keys from raw stdin chunks')
    parsesTerminalControlKeys() {
        expect(parseTerminalControlKey('\u001b[A')).toBe('up');
        expect(parseTerminalControlKey('\u001bOA')).toBe('up');
        expect(parseTerminalControlKey('\u001b[1;2B')).toBe('down');
        expect(parseTerminalControlKey('\u001b[5~')).toBe('pageup');
        expect(parseTerminalControlKey('\u001b[6~')).toBe('pagedown');
        expect(parseTerminalControlKey('\u001b[H')).toBe('home');
        expect(parseTerminalControlKey('\u001b[F')).toBe('end');
        expect(parseTerminalControlKey('\r')).toBe('return');
        expect(parseTerminalControlKey('\u001b')).toBe('escape');
        expect(parseTerminalControlKey('x')).toBe(undefined);
    }

    @Test('parses pasted terminal text prompt chunks before generic submit handling')
    parsesPastedTerminalTextPromptChunks() {
        expect(parseTerminalTextPromptChunk('sk-test')).toEqual({
            text: 'sk-test',
            submitted: false
        });
        expect(parseTerminalTextPromptChunk('sk-test\r')).toEqual({
            text: 'sk-test',
            submitted: true
        });
        expect(parseTerminalTextPromptChunk(Buffer.from('sk-test\nextra'))).toEqual({
            text: 'sk-test',
            submitted: true
        });
    }

    @Test('uses primary screen by default and allows explicit alternate-screen opt-in')
    usesAlternateScreenByDefault() {
        const previous = process.env.TSDI_AGENT_ALT_SCREEN;
        delete process.env.TSDI_AGENT_ALT_SCREEN;
        try {
            expect(shouldUseAlternateScreen()).toBe(false);
            process.env.TSDI_AGENT_ALT_SCREEN = '0';
            expect(shouldUseAlternateScreen()).toBe(false);
            process.env.TSDI_AGENT_ALT_SCREEN = 'false';
            expect(shouldUseAlternateScreen()).toBe(false);
            process.env.TSDI_AGENT_ALT_SCREEN = '1';
            expect(shouldUseAlternateScreen()).toBe(true);
        } finally {
            if (previous === undefined) {
                delete process.env.TSDI_AGENT_ALT_SCREEN;
            } else {
                process.env.TSDI_AGENT_ALT_SCREEN = previous;
            }
        }
    }

    @Test('routes draft navigation keys to input editing only in editable prompt states')
    routesDraftNavigationKeys() {
        expect(shouldRouteDraftNavigationKeys({
            hasBlockingSelectMenu: false,
            hasSessionFocus: false,
            hasMessageFocus: false,
            hasMessageDetailFocus: false,
            inputLocked: false,
            modalPromptActive: false,
            hasActiveTextPrompt: false
        })).toBe(true);

        expect(shouldRouteDraftNavigationKeys({
            hasBlockingSelectMenu: false,
            hasSessionFocus: false,
            hasMessageFocus: false,
            hasMessageDetailFocus: false,
            inputLocked: true,
            modalPromptActive: true,
            hasActiveTextPrompt: true
        })).toBe(true);

        expect(shouldRouteDraftNavigationKeys({
            hasBlockingSelectMenu: true,
            hasSessionFocus: false,
            hasMessageFocus: false,
            hasMessageDetailFocus: false,
            inputLocked: false,
            modalPromptActive: false,
            hasActiveTextPrompt: false
        })).toBe(false);

        expect(shouldRouteDraftNavigationKeys({
            hasBlockingSelectMenu: false,
            hasSessionFocus: true,
            hasMessageFocus: false,
            hasMessageDetailFocus: false,
            inputLocked: false,
            modalPromptActive: false,
            hasActiveTextPrompt: false
        })).toBe(false);
    }

    @Test('restores the most recent non-empty session when preferred session is empty')
    restoresMostRecentNonEmptySession() {
        expect(pickRestoredSessionId('default', [
            { id: 'default', updatedAt: 10, messageCount: 0 },
            { id: 'chat-old', updatedAt: 20, messageCount: 2 },
            { id: 'chat-new', updatedAt: 30, messageCount: 4 }
        ])).toBe('chat-new');

        expect(pickRestoredSessionId('default', [
            { id: 'default', updatedAt: 10, messageCount: 0 },
            { id: 'chat-old', updatedAt: 20, messageCount: 2 }
        ], true)).toBe('default');

        expect(pickRestoredSessionId('default', [
            { id: 'default', updatedAt: 10, messageCount: 3 },
            { id: 'chat-new', updatedAt: 30, messageCount: 4 }
        ])).toBe('default');
    }

    @Test('applies terminal draft chunks without leaking control characters')
    appliesTerminalDraftChunks() {
        expect(applyTerminalInputChunk('', 0, 'hello')).toEqual({
            value: 'hello',
            cursor: 5
        });
        expect(applyTerminalInputChunk('hello', 5, '\u001b[D')).toEqual({
            value: 'hello',
            cursor: 4
        });
        expect(applyTerminalInputChunk('hello', 4, '!')).toEqual({
            value: 'hell!o',
            cursor: 5
        });
        expect(applyTerminalInputChunk('hell!o', 5, '\u007f')).toEqual({
            value: 'hello',
            cursor: 4
        });
        expect(applyTerminalInputChunk('hello', 5, '\u0001\u0015')).toEqual({
            value: 'hello',
            cursor: 5
        });
        expect(applyTerminalInputChunk('hello', 5, '\u001b[<64;46;20M')).toEqual({
            value: 'hello',
            cursor: 5
        });
    }

    @Test('composes terminal chat screen without empty focus rows')
    composesTerminalChatScreenWithoutEmptyFocusRows() {
        const layout = composeTerminalChatScreen({
            headerLine: 'provider / model  |  idle  |  0 tasks  |  idle',
            subHeaderLine: 'session default  |  /tmp/workspace',
            conversationLines: [],
            latestActivity: '',
            latestToolRun: '',
            focusedTool: '',
            toolsSummary: '',
            workingLines: ['Tokens: 0 | Prompt: 0 | Completion: 0'],
            inputLines: ['Input', 'you> hello|'],
            selectLines: [],
            statusLines: ['State: idle']
        });

        expect(layout.lines.some(line => /^focus\s+/.test(line))).toBe(false);
        expect(layout.lines.some(line => /^tool\s+Focused:/.test(line))).toBe(false);
    }

    @Test('composes terminal chat screen with select panel below input')
    composesTerminalChatScreenWithSelectPanelBelowInput() {
        const layout = composeTerminalChatScreen({
            headerLine: 'provider / model  |  idle  |  0 tasks  |  idle',
            subHeaderLine: 'session default  |  /tmp/workspace',
            conversationLines: ['agent> hi'],
            workingLines: ['Tokens: 0 | Prompt: 0 | Completion: 0'],
            inputLines: ['Input', 'you> /mo|'],
            selectLines: ['Select', '› 1. /model'],
            statusLines: ['State: idle']
        });

        const inputIndex = layout.lines.findIndex(line => line === 'you> /mo|');
        const selectIndex = layout.lines.findIndex(line => line === 'Select');
        expect(inputIndex).toBeGreaterThan(-1);
        expect(selectIndex).toBeGreaterThan(inputIndex);
        expect(layout.selectMenuScreenRow).toBe(selectIndex + 1);
    }

    @Test('finds bottom input prompt row instead of message prompt row')
    findsBottomInputPromptRow() {
        const row = findInputPromptRow([
            'tsdi-agent',
            'you> previous message',
            '│ Ask code or files                         │',
            '│ > hello|                                 │',
            '│ enter send tab complete /quit exit       │'
        ]);

        expect(row).toBe(3);
    }

    @Test('builds left-aligned empty-state logo block')
    buildsLeftAlignedEmptyStateLogoBlock() {
        const lines = buildEmptyStateLogoBlock(60, 'TSDI Agent', 'gpt-5.4-flash', '/tmp/workspace', '6.0.31');
        expect(lines).toHaveLength(4);
        expect(lines[0]).toContain('╭');
        expect(lines[1]).toContain('TSDI AGENT v6.0.31');
        expect(lines[1]).toContain('│');
        expect(lines[2]).toContain('gpt-5.4-flash');
        expect(lines[2]).toContain('/tmp/workspace');
        expect(lines[3]).toContain('╰');
    }

    @Test('builds content-adaptive brand header width')
    buildsContentAdaptiveBrandHeaderWidth() {
        const lines = buildBrandHeaderBlock(80, 'A', '', '', '1');
        expect(lines[0]).toContain('╭');
        expect(lines[0]).toContain('─');
        expect(lines[1]).toContain('A v1');
        expect(lines[2]).toContain('│');
        expect(lines[3]).toContain('╰');
    }

    @Test('preserves empty-state logo block when fixed blocks are compacted')
    preservesEmptyStateLogoBlockWhenFixedBlocksAreCompacted() {
        const logo = buildEmptyStateLogoBlock(36, 'TSDI Agent', 'gpt-5.4-flash', '/tmp/workspace', '6.0.31');
        const window = compactRenderedBlocksWindow([
            ['note previous status'],
            logo
        ], 4, 1);

        expect(window.lines.join('\n')).toContain('TSDI AGENT v6.0.31');
        expect(window.lines.join('\n')).toContain('gpt-5.4-flash');
    }

    @Test('measures terminal display width for chinese text')
    measuresTerminalDisplayWidthForChineseText() {
        expect(getTerminalDisplayWidth('abc')).toBe(3);
        expect(getTerminalDisplayWidth('你好')).toBe(4);
        expect(getTerminalDisplayWidth('a你b好')).toBe(6);
    }

    @Test('fits terminal lines by display width for chinese text')
    fitsTerminalLinesByDisplayWidthForChineseText() {
        expect(fitTerminalAnsiLine('你好世界', 6)).toBe('你好世');
        expect(fitTerminalAnsiLine('abc你好', 6)).toBe('abc你');
    }

    @Test('places terminal cursor for active text prompts after menu selection')
    placesTerminalCursorForActiveTextPrompt() {
        expect(shouldPlaceTerminalCursor({
            isTTY: true,
            isSelecting: false,
            hasBlockingSelectMenu: false,
            inputLocked: true,
            modalPromptActive: true,
            hasActiveTextPrompt: true,
            hasSessionFocus: false,
            hasMessageFocus: false,
            hasMessageDetailFocus: false
        })).toBe(true);

        expect(shouldPlaceTerminalCursor({
            isTTY: true,
            isSelecting: false,
            hasBlockingSelectMenu: false,
            inputLocked: true,
            modalPromptActive: true,
            hasActiveTextPrompt: false,
            hasSessionFocus: false,
            hasMessageFocus: false,
            hasMessageDetailFocus: false
        })).toBe(false);
    }

    @Test('suppresses duplicated keypress events after raw control handling')
    suppressesDuplicatedKeypressEvents() {
        const now = Date.now();
        expect(shouldSuppressDuplicatedKeypress({
            lastRawKey: 'down',
            lastRawAt: now,
            now: now + 10,
            keyName: 'down'
        })).toBe(true);

        expect(shouldSuppressDuplicatedKeypress({
            lastRawKey: 'digit',
            lastRawAt: now,
            now: now + 10,
            text: '2'
        })).toBe(true);

        expect(shouldSuppressDuplicatedKeypress({
            lastRawKey: 'q',
            lastRawAt: now,
            now: now + 10,
            keyName: 'q',
            text: 'q'
        })).toBe(true);

        expect(shouldSuppressDuplicatedKeypress({
            lastRawKey: 'down',
            lastRawAt: now,
            now: now + 60,
            keyName: 'down'
        })).toBe(false);
    }

    @Test('resolves raw keypress suppression keys for menu and submit chunks')
    resolvesRawKeypressSuppressionKeys() {
        expect(resolveRawKeypressSuppressionKey({
            rawText: '/help\r',
            submitTriggered: true
        })).toBe('return');

        expect(resolveRawKeypressSuppressionKey({
            rawText: '2',
            menuKey: '2'
        })).toBe('digit');

        expect(resolveRawKeypressSuppressionKey({
            rawText: 'q',
            menuKey: 'q'
        })).toBe('q');

        expect(resolveRawKeypressSuppressionKey({
            rawText: '\u001b[B',
            controlKey: 'down'
        })).toBe('down');
    }

    @Test('compacts rendered lines from the top and keeps recent content near input')
    compactsRenderedLinesFromTop() {
        expect(compactRenderedLines([
            '',
            'old-1',
            '',
            '',
            'old-2',
            'recent-1',
            '',
            'recent-2',
            ''
        ], 4)).toEqual([
            'old-2',
            'recent-1',
            '',
            'recent-2'
        ]);
    }

    @Test('keeps ansi-painted shell spacer lines during compaction')
    keepsAnsiPaintedShellSpacerLinesDuringCompaction() {
        const ansiBlank = '\u001b[48;2;27;33;40m    \u001b[0m';
        expect(compactRenderedLines([
            '',
            ansiBlank,
            '\u001b[48;2;27;33;40m   › hi   \u001b[0m',
            ansiBlank,
            '',
            'footer'
        ], 6)).toEqual([
            ansiBlank,
            '\u001b[48;2;27;33;40m   › hi   \u001b[0m',
            ansiBlank,
            'footer'
        ]);
    }

    @Test('compacts rendered blocks around the newest transcript blocks')
    compactsRenderedBlocksAroundNewestTranscriptBlocks() {
        expect(compactRenderedBlocks([
            ['notice'],
            ['msg-1-a', 'msg-1-b'],
            ['shell-1', 'shell-2'],
            ['working']
        ], 4)).toEqual([
            '…',
            'shell-1',
            'shell-2',
            'working'
        ]);
    }

    @Test('anchors rendered block compaction around selected message blocks')
    anchorsRenderedBlockCompactionAroundSelectedMessageBlocks() {
        expect(compactRenderedBlocks([
            ['old-1'],
            ['selected-1', 'selected-2'],
            ['new-1'],
            ['new-2']
        ], 4, 1)).toEqual([
            'old-1',
            'selected-1',
            'selected-2',
            'new-1'
        ]);
    }

    @Test('windows transcript lines from the bottom for history scrolling')
    windowsTranscriptLinesFromTheBottom() {
        expect(windowRenderedLinesFromBottom([
            'l1', 'l2', 'l3', 'l4', 'l5'
        ], 3, 0)).toEqual({
            lines: ['l3', 'l4', 'l5'],
            startRow: 2,
            totalRows: 5
        });

        expect(windowRenderedLinesFromBottom([
            'l1', 'l2', 'l3', 'l4', 'l5'
        ], 3, 1)).toEqual({
            lines: ['l2', 'l3', 'l4'],
            startRow: 1,
            totalRows: 5
        });
    }

    @Test('preserves previous transcript context when latest message is taller than the viewport')
    preservesPreviousTranscriptContextWhenLatestMessageIsTallerThanTheViewport() {
        expect(windowRenderedBlocksFromBottomWithContext([
            ['old-1', 'old-2'],
            ['new-1', 'new-2', 'new-3', 'new-4', 'new-5', 'new-6']
        ], 5, 2)).toEqual({
            lines: ['old-1', 'old-2', '…', 'new-5', 'new-6'],
            startRow: 0,
            totalRows: 8
        });
    }

    @Test('preserves tail context even when the previous transcript block is also taller than the viewport budget')
    preservesTailContextWhenPreviousTranscriptBlockIsAlsoTall() {
        expect(windowRenderedBlocksFromBottomWithContext([
            ['old-1', 'old-2', 'old-3', 'old-4', 'old-5'],
            ['new-1', 'new-2', 'new-3', 'new-4', 'new-5', 'new-6']
        ], 5, 2)).toEqual({
            lines: ['…', 'old-4', 'old-5', '…', 'new-6'],
            startRow: 3,
            totalRows: 11
        });
    }

    @Test('keeps suggestion rows separate from select panel rows')
    keepsSuggestionRowsSeparateFromSelectPanelRows() {
        const layout = composeTerminalChatScreen({
            headerLine: 'provider / model  |  idle  |  0 tasks  |  idle',
            subHeaderLine: 'session default  |  /tmp/workspace',
            conversationLines: ['agent> hi'],
            workingLines: [],
            inputLines: ['Input', 'you> /mo|'],
            selectLines: [],
            statusLines: ['State: idle']
        });

        expect(layout.selectMenuScreenRow).toBe(-1);
    }
}
