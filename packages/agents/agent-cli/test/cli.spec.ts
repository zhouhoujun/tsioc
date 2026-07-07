import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { TuiRenderer } from '@tsdi/components/console';
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
    moveSuggestionSelection,
    normalizeSuggestionState,
    renderActivityLine,
    composeTerminalChatScreen,
    renderDraftLine,
    buildMentionContextLines,
    renderMessagePreview,
    renderSelectMenu,
    renderToolDetail,
    renderToolRunLine,
    resolveUniqueCommandPrefix,
    resolveInputSuggestions,
    shouldAcceptSuggestionOnEnter,
    resolveCliConfig,
    resolveCliModelConfig,
    resolveProviderApiKeyEnv,
    resolveProviderProfile,
    runAgentPrompt,
    sortToolRuns,
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

    @Test('defaults workspace to root workspace directory')
    async defaultsWorkspaceToRootWorkspaceDirectory() {
        const root = await this.createRoot();
        const resolved = resolveCliConfig({ root });
        expect(resolved.root).toBe(path.resolve(root));
        expect(resolved.settingsPath).toBe(path.resolve(root, 'settings.json'));
        expect(resolved.workspace).toBe(path.resolve(root, 'workspace'));
        expect(resolved.tools.file?.rootDir).toBe(path.resolve(root, 'workspace'));
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
            defaultProfile: 'fast',
            profiles: {
                fast: {
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
                simple: 'fast',
                moderate: 'fast',
                complex: 'strong'
            }
        } as any);

        const modelConfig = resolveCliModelConfig({}, root);
        expect(modelConfig.provider).toBe('deepseek');
        expect(modelConfig.model).toBe('deepseek-v4-flash');
        expect(modelConfig.defaultProfile).toBe('fast');
        expect((modelConfig.profiles as any).strong.model).toBe('deepseek-v4-pro');
        expect((modelConfig.complexityRouting as any).complex).toBe('strong');
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
            { label: 'DeepSeek', value: 'deepseek' },
            { label: 'OpenAI', value: 'openai', description: 'default' }
        ], 1)).toEqual([
            'Model providers',
            '',
            '  1. DeepSeek',
            '› 2. OpenAI  default',
            '',
            '1-9 select   up/down move   enter confirm   q cancel'
        ]);
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
        expect(shouldAcceptSuggestionOnEnter('/mo', moved)).toBe(true);
        expect(renderDraftLine('run @workspace with @read_file')).toBe('run [@workspace] with [@read_file]');
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
