#!/usr/bin/env node
import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { runAgentApplication, runAgentPrompt, runAgentStreaming } from './run-command';
import { AgentCliProviderProfile, ensureAgentWorkspaceConfig, resolveCliConfig, resolveCliModelConfig, resolveProviderApiKeyEnv, resolveProviderBaseUrl, writeSettingsModelProfile } from './config';
import {
    applySuggestionToInput,
    buildMentionCandidates,
    enrichPromptWithMentions,
    fitLine,
    getActiveInputToken,
    getChatCommands,
    moveSuggestionSelection,
    normalizeSuggestionState,
    parseTerminalMouseEvent,
    renderConversationMessage,
    renderActivityLine,
    renderDraftLine,
    renderSelectMenu,
    resolveSelectMenuOptionIndexFromRow,
    renderToolDetail,
    renderToolRunLine,
    resolveUniqueCommandPrefix,
    resolveInputSuggestions,
    shouldAcceptSuggestionOnEnter,
    sortToolRuns,
    SuggestionState
} from './ui';

const HISTORY_FILE = 'chat-history.json';
const SPINNER_FRAMES = ['-', '\\', '|', '/'];
const CANCEL_INPUTS = new Set(['q', 'cancel', '/cancel']);
const EXIT_INPUTS = new Set(['/exit', '/quit']);
const MODEL_PROVIDER_CHOICES = [
    { key: 'deepseek', label: 'DeepSeek', provider: 'deepseek' },
    { key: 'openai', label: 'OpenAI', provider: 'openai' },
    { key: 'openai-compatible', label: 'Custom OpenAI-Compatible', provider: 'openai-compatible' },
    { key: 'anthropic', label: 'Custom Anthropic-Compatible', provider: 'anthropic' }
];
const PROVIDER_MODELS: Record<string, string[]> = {
    deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    openai: ['gpt-4o-mini', 'gpt-4.1'],
    'openai-compatible': [],
    anthropic: []
};
const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
    deepseek: 'deepseek-v4-flash',
    openai: 'gpt-4o-mini',
    'openai-compatible': 'custom-model',
    anthropic: 'claude-sonnet-4-20250514'
};

class ChatExitRequest extends Error {
    constructor() {
        super('CHAT_EXIT_REQUEST');
    }
}

interface SelectMenuOption {
    label: string;
    value: string;
    description?: string;
}

interface SelectMenuState {
    title: string;
    hint?: string;
    options: SelectMenuOption[];
    selectedIndex: number;
    resolve: (value: string | undefined) => void;
}

function createAgentCli(): Command {
    const program = new Command();
    program.name('tsdi-agent');
    program.version('6.0.31');

    program
        .command('run [prompt]')
        .description('Run a single prompt and return the response.')
        .option('--session <id>', 'Session ID.')
        .option('--root <dir>', 'Agent config root. Defaults to ~/.tsdi-agent.')
        .option('--workspace <dir>', 'Workspace directory for file tools.')
        .option('--tools <items>', 'Comma-separated tool names or groups to enable.')
        .option('--no-default-tools', 'Disable default tool groups.')
        .option('--provider <name>', 'Model provider (deepseek, openai, etc.)')
        .option('--model <name>', 'Model name.')
        .option('--base-url <url>', 'API base URL.')
        .option('--api-key <key>', 'API key.')
        .option('--api-key-env <name>', 'Env var name for API key.')
        .option('--timeout <ms>', 'Request timeout in ms.')
        .option('--stream', 'Stream the response.')
        .option('--json', 'Output JSON.')
        .action(async (prompt: string, options: any) => {
            if (options.stream) {
                await runAgentStreaming(prompt || '', options);
                return;
            }
            const output = await runAgentPrompt(prompt || '', options);
            if (options.json) {
                process.stdout.write(JSON.stringify({ output }) + '\n');
                return;
            }
            process.stdout.write(output + '\n');
        });

    program
        .command('chat')
        .description('Start an interactive chat session with streaming responses.')
        .option('--session <id>', 'Session ID for conversation continuity.')
        .option('--root <dir>', 'Agent config root. Defaults to ~/.tsdi-agent.')
        .option('--workspace <dir>', 'Workspace directory for file tools.')
        .option('--tools <items>', 'Comma-separated tool names or groups to enable.')
        .option('--no-default-tools', 'Disable default tool groups.')
        .option('--provider <name>', 'Model provider (deepseek, openai, etc.)')
        .option('--model <name>', 'Model name.')
        .option('--base-url <url>', 'API base URL.')
        .option('--api-key <key>', 'API key.')
        .option('--api-key-env <name>', 'Env var name for API key.')
        .option('--timeout <ms>', 'Request timeout in ms.')
        .action(async (options: any) => {
            await runInteractiveChat(options);
        });

    program
        .command('tools list')
        .description('List resolved tool configuration.')
        .option('--root <dir>', 'Agent config root.')
        .option('--tools <items>', 'Comma-separated tool names.')
        .option('--no-default-tools', 'Disable defaults.')
        .action((options: any) => {
            const resolved = resolveCliConfig(options);
            process.stdout.write(JSON.stringify({
                root: resolved.root,
                settingsPath: resolved.settingsPath,
                workspace: resolved.workspace,
                skillRoots: resolved.skillRoots,
                tools: resolved.tools.registration ?? {}
            }, null, 2) + '\n');
        });

    return program;
}

async function runInteractiveChat(options: any): Promise<void> {
    const {
        AgentRuntime, mergeAgentOptions, ToolRegistry,
        AgentConsoleComponent, AgentConsoleSessionState, AgentUiModule,
        AgentConsoleStatusPanelComponent, AgentConsoleSelectPanelComponent,
        AgentConsoleActivityPanelComponent, AgentConsoleToolsPanelComponent,
        AgentConsoleToolRunsPanelComponent, AgentConsoleMessagesPanelComponent
    } = require('@tsdi/agent');
    const { ConsoleRenderer } = require('@tsdi/components/console');

    const resolved = resolveCliConfig(options);
    ensureAgentWorkspaceConfig(resolved.root, path.basename(resolved.workspace));
    const historyPath = path.join(resolved.root, HISTORY_FILE);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: (line: string) => {
            const mentions = buildMentionCandidates((viewModel?.tools || []).map((tool: any) => tool.name));
            const token = getActiveInputToken(line) || line;
            const pool = token.startsWith('@')
                ? mentions.map(item => ({ group: 'Mentions' as const, label: item, value: item }))
                : getChatCommands().map(item => ({ group: 'Commands' as const, label: item, value: item }));
            const hits = pool.filter(item => item.value.startsWith(token));
            return [(hits.length ? hits : pool).map(item => item.value), token];
        },
        prompt: '\n> '
    });

    const sessionId = resolved.sessionId;
    let currentProfile = resolveCliModelConfig(options, resolved.root);
    let currentCtx: any = null;
    let runtime: any = null;
    let toolRegistry: any = null;
    let viewModel: any = null;
    let consoleState: any = null;
    let consoleRenderer: any = null;
    let statusPanelRef: any = null;
    let selectPanelRef: any = null;
    let activityPanelRef: any = null;
    let toolsPanelRef: any = null;
    let toolRunsPanelRef: any = null;
    let messagesPanelRef: any = null;
    let unsubscribeVm: (() => void) | null = null;
    let inputLocked = false;
    let lastRenderKey = '';
    let screenNotice = '';
    let spinnerIndex = 0;
    let multilineMode = false;
    let draftLines: string[] = [];
    let currentDraft = '';
    let isClosed = false;
    let modalPromptActive = false;
    let selectMenu: SelectMenuState | null = null;
    let suggestionState: SuggestionState = { items: [], selectedIndex: -1 };
    let isSelecting = false;
    let stdinDataHandler: ((chunk: Buffer | string) => void) | null = null;
    let keypressHandler: ((str: string, key: readline.Key) => void) | null = null;
    let resizeHandler: (() => void) | null = null;
    let sigintHandler: (() => void) | null = null;
    const historyInterface = rl as readline.Interface & { history?: string[] };

    const getActiveSelectMenu = (): { title: string; hint?: string; options: SelectMenuOption[]; selectedIndex: number } | undefined => {
        if (consoleState?.selectMenu) {
            return consoleState.selectMenu;
        }
        return selectMenu || undefined;
    };

    const safePrompt = (preserveCursor = false) => {
        if (isClosed || (rl as any).closed || isSelecting) {
            return;
        }
        rl.prompt(preserveCursor);
    };

    const refreshInputLine = () => {
        if (isClosed || (rl as any).closed || isSelecting) {
            return;
        }
        const refresh = (rl as any)._refreshLine;
        if (typeof refresh === 'function') {
            refresh.call(rl);
            return;
        }
        safePrompt(true);
    };

    const loadHistory = (): string[] => {
        if (!fs.existsSync(historyPath)) {
            return [];
        }
        try {
            const parsed = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
        } catch {
            return [];
        }
    };

    const persistHistory = () => {
        const unique = Array.from(new Set((historyInterface.history || []).slice().reverse().filter(Boolean)));
        fs.writeFileSync(historyPath, JSON.stringify(unique.slice(-200), null, 2) + '\n', 'utf8');
    };

    historyInterface.history = loadHistory().slice().reverse();

    const promptLine = (question: string): Promise<string> => new Promise(resolve => {
        const previousLocked = inputLocked;
        inputLocked = true;
        modalPromptActive = true;
        isSelecting = false;
        selectMenu = null;
        consoleState?.closeSelectMenu?.();
        currentDraft = '';
        suggestionState = { items: [], selectedIndex: -1 };
        (rl as any).line = '';
        (rl as any).cursor = 0;
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        rl.question(question, answer => {
            inputLocked = previousLocked;
            modalPromptActive = false;
            currentDraft = '';
            resolve(answer.trim());
        });
    });

    const pauseReadlineForSelection = () => {
        if (isClosed || (rl as any).closed) {
            return;
        }
        isSelecting = true;
        rl.pause();
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
    };

    const resumeReadlineAfterSelection = () => {
        if (isClosed || (rl as any).closed) {
            return;
        }
        isSelecting = false;
        rl.resume();
        renderScreen();
        safePrompt();
    };

    const promptSelect = (title: string, options: SelectMenuOption[], initialIndex = 0, hint = '1-9 select   up/down move   enter confirm   q cancel'): Promise<string | undefined> => {
        if (viewModel?.select) {
            inputLocked = true;
            modalPromptActive = true;
            currentDraft = '';
            suggestionState = { items: [], selectedIndex: -1 };
            (rl as any).line = '';
            (rl as any).cursor = 0;
            pauseReadlineForSelection();
            renderSelectionNotice();
            return viewModel.select(title, options, initialIndex, hint).finally(() => {
                inputLocked = false;
                modalPromptActive = false;
                currentDraft = '';
                resumeReadlineAfterSelection();
            });
        }
        const previousLocked = inputLocked;
        inputLocked = true;
        modalPromptActive = true;
        currentDraft = '';
        suggestionState = { items: [], selectedIndex: -1 };
        (rl as any).line = '';
        (rl as any).cursor = 0;
        return new Promise(resolve => {
            pauseReadlineForSelection();
            selectMenu = {
                title,
                hint,
                options,
                selectedIndex: Math.max(0, Math.min(options.length - 1, initialIndex)),
                resolve: (value: string | undefined) => {
                    selectMenu = null;
                    modalPromptActive = false;
                    inputLocked = previousLocked;
                    currentDraft = '';
                    if (consoleState?.selectMenuAction === resolveSelection) {
                        consoleState.selectMenuAction = undefined;
                    }
                    consoleState?.closeSelectMenu?.();
                    resumeReadlineAfterSelection();
                    resolve(value);
                }
            };
            const resolveSelection = async (value: string | undefined) => {
                selectMenu?.resolve(value);
            };
            consoleState?.openSelectMenu?.(title, options, initialIndex, hint);
            consoleState.selectMenuAction = resolveSelection;
            renderSelectionNotice();
        });
    };

    const syncCurrentDraft = () => {
        currentDraft = (rl as any).line || '';
        const nextItems = resolveInputSuggestions(
            currentDraft,
            viewModel?.commandHints || getChatCommands(),
            buildMentionCandidates((viewModel?.tools || []).map((tool: any) => tool.name))
        );
        suggestionState = normalizeSuggestionState(nextItems, suggestionState.selectedIndex >= 0 ? suggestionState.selectedIndex : 0);
    };

    const renderSelectionNotice = () => {
        if (isClosed || (rl as any).closed) {
            return;
        }
        process.stdout.write('\x1b[2J\x1b[H');
        process.stdout.write('tsdi-agent\n\n');
        const rendererLines = renderPanelLines(selectPanelRef, {
            maxLines: 24
        });
        if (rendererLines.length) {
            process.stdout.write(`${rendererLines.join('\n')}\n\n`);
            return;
        }
        const menu = getActiveSelectMenu();
        if (menu) {
            const lines = renderSelectMenu(menu.title, menu.options, menu.selectedIndex, menu.hint);
            process.stdout.write(`${lines.join('\n')}\n\n`);
            return;
        }
        process.stdout.write(`${screenNotice}\n\n`);
    };

    const hasInteractiveSuggestions = (): boolean => {
        const token = getActiveInputToken(currentDraft);
        return !!token && (token.startsWith('/') || token.startsWith('@')) && suggestionState.items.length > 0;
    };

    const isCancelInput = (value?: string): boolean => CANCEL_INPUTS.has(String(value || '').trim().toLowerCase());
    const isExitInput = (value?: string): boolean => EXIT_INPUTS.has(String(value || '').trim().toLowerCase());
    const assertNoExitInput = (value?: string) => {
        if (isExitInput(value)) {
            throw new ChatExitRequest();
        }
    };

    const resolveSlashCommand = (input: string): string => {
        return resolveUniqueCommandPrefix(input, viewModel?.commandHints || getChatCommands());
    };

    const getMatchingSlashCommands = (input: string): string[] => {
        const trimmed = input.trim();
        if (!trimmed.startsWith('/')) {
            return [];
        }
        return (viewModel?.commandHints || getChatCommands()).filter((item: string) => item.startsWith(trimmed));
    };

    const resolveProviderSelection = async (
        current?: Partial<AgentCliProviderProfile>
    ): Promise<Pick<AgentCliProviderProfile, 'provider' | 'model' | 'baseUrl' | 'apiKeyEnv'> | undefined> => {
        const getProviderScopedValue = (
            provider: string,
            key: 'model' | 'baseUrl' | 'apiKeyEnv'
        ): string | undefined => {
            if (current?.provider === provider && typeof current[key] === 'string' && current[key]) {
                return current[key] as string;
            }
            if (key === 'model') {
                return PROVIDER_DEFAULT_MODELS[provider] || 'custom-model';
            }
            if (key === 'baseUrl') {
                return resolveProviderBaseUrl(provider) || '';
            }
            return resolveProviderApiKeyEnv(provider);
        };

        const providerOptions = MODEL_PROVIDER_CHOICES.map(item => ({
            label: item.label,
            value: item.provider
        }));
        const currentProviderIndex = Math.max(0, MODEL_PROVIDER_CHOICES.findIndex(item => item.provider === current?.provider));
        const provider = await promptSelect('Model providers', providerOptions, currentProviderIndex);
        if (!provider) {
            return undefined;
        }
        const providerSelection = MODEL_PROVIDER_CHOICES.find(item => item.provider === provider) || MODEL_PROVIDER_CHOICES[0];
        const models = PROVIDER_MODELS[provider] || [];

        let model = getProviderScopedValue(provider, 'model') || PROVIDER_DEFAULT_MODELS[provider];
        if (models.length) {
            const modelOptions = models.map(item => ({ label: item, value: item }));
            const currentModelIndex = Math.max(0, models.indexOf(model));
            const selectedModel = await promptSelect(`Models for ${providerSelection.label}`, modelOptions, currentModelIndex);
            if (!selectedModel) {
                return undefined;
            }
            model = selectedModel;
        } else {
            const modelAnswer = await promptLine(`Model name [${model}]: `);
            assertNoExitInput(modelAnswer);
            if (isCancelInput(modelAnswer)) {
                return undefined;
            }
            model = modelAnswer || model;
        }

        const defaultBaseUrl = getProviderScopedValue(provider, 'baseUrl') || '';
        let baseUrl = defaultBaseUrl;
        if (provider === 'openai-compatible' || provider === 'anthropic') {
            const baseUrlAnswer = await promptLine(`Base URL [${defaultBaseUrl}]: `);
            assertNoExitInput(baseUrlAnswer);
            if (isCancelInput(baseUrlAnswer)) {
                return undefined;
            }
            baseUrl = baseUrlAnswer || defaultBaseUrl;
        }

        return {
            provider,
            model,
            baseUrl,
            apiKeyEnv: getProviderScopedValue(provider, 'apiKeyEnv')
        };
    };

    const ensureInteractiveProfile = async (): Promise<AgentCliProviderProfile> => {
        const hasExplicitConfig = !!options.provider || !!options.model || !!options.apiKey || !!options.apiKeyEnv || !!options.baseUrl;
        const resolvedProfile = resolveCliModelConfig(options, resolved.root);
        const hasPersistedProvider = !!resolved.settingsModel?.provider && !!resolved.settingsModel?.model;
        const hasAdaptiveModelConfig = !!resolved.settingsModel?.defaultProfile || !!resolved.settingsModel?.profiles || !!resolved.settingsModel?.complexityRouting;
        const hasResolvedApiKey = !!resolvedProfile.apiKey;
        if (hasExplicitConfig || hasPersistedProvider || hasAdaptiveModelConfig || hasResolvedApiKey) {
            return resolvedProfile;
        }

        const selected = await resolveProviderSelection(resolved.settingsModel || resolved.providerProfile);
        if (!selected) {
            throw new Error('Model setup cancelled.');
        }
        const apiKey = await promptLine(`API key for ${selected.provider}: `);
        assertNoExitInput(apiKey);
        if (isCancelInput(apiKey)) {
            throw new Error('Model setup cancelled.');
        }
        const profile: AgentCliProviderProfile = {
            provider: selected.provider,
            model: selected.model,
            baseUrl: selected.baseUrl,
            apiKey,
            apiKeyEnv: selected.apiKeyEnv,
            timeoutMs: 120000
        };
        const settingsPath = writeSettingsModelProfile(resolved.root, profile);
        if (!fs.existsSync(resolved.workspace)) {
            fs.mkdirSync(resolved.workspace, { recursive: true });
        }
        process.stdout.write(`Saved model config to ${settingsPath}\n`);
        return profile;
    };

    const createChatContext = async (profile: AgentCliProviderProfile): Promise<void> => {
        if (viewModel) {
            viewModel.dispose?.();
            viewModel = null;
        }
        if (unsubscribeVm) {
            unsubscribeVm();
            unsubscribeVm = null;
        }
        if (currentCtx) {
            await currentCtx.close();
        }
        const agentOptions = mergeAgentOptions({
            model: {
                provider: profile.provider,
                model: profile.model,
                baseUrl: profile.baseUrl,
                apiKey: profile.apiKey,
                apiKeyEnv: profile.apiKeyEnv,
                timeoutMs: profile.timeoutMs || 120000
            }
        });
        currentCtx = await runAgentApplication({
            ...options,
            root: resolved.root,
            workspace: resolved.workspace,
            session: resolved.sessionId,
            provider: profile.provider,
            model: profile.model,
            baseUrl: profile.baseUrl,
            apiKey: profile.apiKey,
            apiKeyEnv: profile.apiKeyEnv,
            timeout: String(profile.timeoutMs || 120000)
        }, agentOptions);
        currentCtx.get(AgentUiModule);
        runtime = currentCtx.get(AgentRuntime);
        toolRegistry = currentCtx.get(ToolRegistry);
        viewModel = currentCtx.get(AgentConsoleComponent);
        consoleState = currentCtx.get(AgentConsoleSessionState);
        consoleRenderer = currentCtx.get(ConsoleRenderer);
        viewModel.configure({
            sessionId,
            provider: profile.provider,
            model: profile.model,
            workspace: resolved.workspace
        });
        await viewModel.onInit();
        const runnerRef = currentCtx.runners?.getRef?.(AgentConsoleComponent);
        statusPanelRef = runnerRef?.hostView?.query?.(AgentConsoleStatusPanelComponent) || null;
        selectPanelRef = runnerRef?.hostView?.query?.(AgentConsoleSelectPanelComponent) || null;
        activityPanelRef = runnerRef?.hostView?.query?.(AgentConsoleActivityPanelComponent) || null;
        toolsPanelRef = runnerRef?.hostView?.query?.(AgentConsoleToolsPanelComponent) || null;
        toolRunsPanelRef = runnerRef?.hostView?.query?.(AgentConsoleToolRunsPanelComponent) || null;
        messagesPanelRef = runnerRef?.hostView?.query?.(AgentConsoleMessagesPanelComponent) || null;
        viewModel.setCommandAction('/help', async () => {
            inputLocked = true;
            screenNotice = [
                'Commands:',
                '  /quit, /exit  - Exit the chat session.',
                '  /help         - Show this help.',
                '  /clear        - Re-render the screen.',
                '  /model        - Switch provider/model.',
                '  /tools        - List available tools.',
                '  /multiline    - Toggle multiline input mode.',
                '  /send         - Send buffered multiline input.',
                '  /cancel       - Clear buffered multiline input.',
                '  @workspace    - Inject current workspace context.',
                '  @tools        - Inject available tool list.',
                '  @model        - Inject current model/provider.',
                '  @session      - Inject current session id.',
                '  @<tool>       - Inject a specific tool summary.',
                '  Tab           - Command completion.'
            ].join('\n');
            viewModel?.showNotice?.(screenNotice);
            inputLocked = false;
            renderScreen();
            safePrompt();
        });
        viewModel.setCommandAction('/clear', async () => {
            screenNotice = '';
            viewModel?.clearNotice?.();
            renderScreen();
            safePrompt();
        });
        viewModel.setCommandAction('/tools', async () => {
            inputLocked = true;
            screenNotice = (viewModel.tools || []).length
                ? ['Tools:', ...(viewModel.tools || []).map((tool: any) => {
                    const inactive = tool.active ? '' : ' [inactive]';
                    const toolset = tool.toolset ? ` (${tool.toolset})` : '';
                    return `  - ${tool.name}${toolset}${inactive}`;
                })].join('\n')
                : 'Tools:\n  (empty)';
            viewModel?.showNotice?.(screenNotice);
            inputLocked = false;
            renderScreen();
            safePrompt();
        });
        viewModel.setCommandAction('/model', async () => {
            inputLocked = true;
            currentDraft = '';
            suggestionState = { items: [], selectedIndex: -1 };
            screenNotice = `Current provider: ${currentProfile.provider}\nCurrent model: ${currentProfile.model}`;
            viewModel?.showNotice?.(screenNotice);
            renderSelectionNotice();
            try {
                const selected = await resolveProviderSelection(currentProfile);
                if (!selected) {
                    screenNotice = 'Model switch cancelled.';
                    viewModel?.showNotice?.(screenNotice);
                    return;
                }
                const provider = selected.provider;
                const model = selected.model;
                const baseUrl = selected.baseUrl;
                const apiKeyEnv = selected.apiKeyEnv || currentProfile.apiKeyEnv || resolveProviderApiKeyEnv(provider);
                const apiKeyLabel = currentProfile.provider === provider && currentProfile.apiKey ? '******' : 'empty';
                const apiKeyInput = await promptLine(`API key [${apiKeyLabel}]: `);
                assertNoExitInput(apiKeyInput);
                if (isCancelInput(apiKeyInput)) {
                    screenNotice = 'Model switch cancelled.';
                    viewModel?.showNotice?.(screenNotice);
                    return;
                }
                const apiKeyFromEnv = apiKeyEnv ? process.env[apiKeyEnv] : undefined;
                const apiKey = apiKeyInput
                    || (currentProfile.provider === provider ? currentProfile.apiKey : '')
                    || apiKeyFromEnv
                    || '';
                if (!apiKey) {
                    screenNotice = `Model switch cancelled: missing API key for ${provider}.`;
                    viewModel?.showNotice?.(screenNotice);
                    return;
                }
                const nextProfile: AgentCliProviderProfile = {
                    provider,
                    model,
                    apiKey,
                    baseUrl,
                    apiKeyEnv,
                    timeoutMs: currentProfile.timeoutMs || 120000
                };
                writeSettingsModelProfile(resolved.root, nextProfile);
                await createChatContext(nextProfile);
                screenNotice = `Switched to ${nextProfile.provider} / ${nextProfile.model}`;
                viewModel?.showNotice?.(screenNotice);
            } catch (error: any) {
                if (error instanceof ChatExitRequest) {
                    isClosed = true;
                    rl.close();
                    return;
                }
                screenNotice = `Error: ${error.message}`;
                viewModel?.showNotice?.(screenNotice);
            } finally {
                inputLocked = false;
                renderScreen();
                safePrompt();
            }
        });
        unsubscribeVm = viewModel.subscribe(() => {
            if (isSelecting) {
                renderSelectionNotice();
                return;
            }
            if (!inputLocked) {
                renderScreen();
            }
        });
        currentProfile = profile;
    };

    const renderPanelLines = (
        panelRef: any,
        options: {
            heading?: string;
            maxLines?: number;
            skipLinesStartingWith?: string[];
            prefix?: string;
            widthLimit?: number;
        } = {}
    ): string[] => {
        if (!consoleRenderer || !panelRef?.hostView?.rootNodes?.length) {
            return [];
        }
        const heading = options.heading || '';
        const skipPrefixes = options.skipLinesStartingWith || [];
        const widthLimit = options.widthLimit || (process.stdout.columns || 100);
        const lines = consoleRenderer.renderToLines(panelRef.hostView.rootNodes)
            .filter((line: string) => {
                if (!line) {
                    return false;
                }
                if (heading && line === heading) {
                    return false;
                }
                return !skipPrefixes.some(prefix => line.startsWith(prefix));
            })
            .map((line: string) => {
                const fitted = fitLine(line, Math.max(24, widthLimit));
                return options.prefix ? `${options.prefix}${fitted}` : fitted;
            });
        return typeof options.maxLines === 'number'
            ? lines.slice(0, options.maxLines)
            : lines;
    };

    try {
        currentProfile = await ensureInteractiveProfile();
        await createChatContext(currentProfile);
    } catch (error: any) {
        if (error instanceof ChatExitRequest) {
            isClosed = true;
            rl.close();
            return;
        }
        process.stdout.write(`${error.message}\n`);
        rl.close();
        return;
    }

    const renderScreen = () => {
        if (isClosed || (rl as any).closed || !viewModel) {
            return;
        }
        if (modalPromptActive && !isSelecting) {
            return;
        }
        const width = Math.max(72, (process.stdout.columns || 100) - 2);
        const rows = Math.max(24, process.stdout.rows || 36);
        const spinner = SPINNER_FRAMES[spinnerIndex % SPINNER_FRAMES.length];
        const runningTools = viewModel.runningTools?.length
            ? `${spinner} ${viewModel.runningTools.join(', ')}`
            : 'idle';
        const rendererLines = renderPanelLines(statusPanelRef, {
            maxLines: 12,
            widthLimit: width
        });
        const activityPanelLines = renderPanelLines(activityPanelRef, {
            heading: 'Activity',
            maxLines: 3,
            prefix: 'activity  ',
            widthLimit: width - 10
        });
        const toolsPanelLines = renderPanelLines(toolsPanelRef, {
            heading: 'Tools',
            maxLines: 3,
            skipLinesStartingWith: ['Tools: '],
            prefix: 'tools  ',
            widthLimit: width - 7
        });
        const toolRunsPanelLines = renderPanelLines(toolRunsPanelRef, {
            heading: 'Tool Runs',
            maxLines: 4,
            widthLimit: width - 7
        }).map((line: string, index: number) => `${index === 0 ? 'tool' : 'focus'}  ${line}`);
        const messagesPanelLines = renderPanelLines(messagesPanelRef, {
            heading: 'Messages',
            maxLines: Math.max(6, rows - 12),
            widthLimit: width - 4
        });
        const headerLine = fitLine(
            `${viewModel.provider || currentProfile.provider} / ${viewModel.model || currentProfile.model}  |  ${viewModel.status}  |  ${viewModel.tasksCount} tasks  |  ${runningTools}`,
            width
        );
        const subHeaderLine = fitLine(
            `session ${viewModel.sessionId}  |  ${viewModel.workspace || resolved.workspace}`,
            width
        );
        const messages = messagesPanelLines.length
            ? messagesPanelLines.flatMap((line: string) => [line, ''])
            : (viewModel.messages || [])
                .slice(-8)
                .flatMap((message: any) => renderConversationMessage(message.role, message.content, width - 4));
        const draft = multilineMode
            ? [
                `draft  multiline | ${draftLines.length} buffered`,
                ...draftLines.map((line, index) => `${index + 1}. ${renderDraftLine(line)}`),
                `current  ${renderDraftLine(currentDraft) || '(empty)'}`
            ]
            : [
                `draft  ${renderDraftLine(currentDraft) || '(empty)'}`
            ];
        const suggestions = suggestionState.items.map((item, index) =>
            index === suggestionState.selectedIndex
                ? `> ${item.label}   ${item.group.toLowerCase()}`
                : `  ${item.label}   ${item.group.toLowerCase()}`
        );
        const composer = [
            ...draft,
            ...(hasInteractiveSuggestions() ? [' ', 'suggestions', ...suggestions] : []),
            ' ',
            `enter send   tab complete   up/down select   /help`
        ];
        const composerHeight = Math.max(5, multilineMode ? 7 : 5);
        const contextHeight = Math.max(3, Math.min(5, Math.floor(rows * 0.12)));
        const messagesHeight = Math.max(10, rows - 4 - contextHeight - composerHeight);
        const contextLines = [
            ...(screenNotice ? [`notice  ${screenNotice.split('\n')[0]}`] : []),
            ...(activityPanelLines.length ? activityPanelLines.slice(-1) : viewModel.activities.length ? [`activity  ${fitLine(renderActivityLine(viewModel.activities[viewModel.activities.length - 1]), Math.max(24, width - 10))}`] : []),
            ...(toolRunsPanelLines.length ? toolRunsPanelLines.slice(0, 2) : (() => {
                const sortedToolRuns = sortToolRuns(viewModel.toolRuns || []);
                const toolRuns = sortedToolRuns
                    .slice(0, 1)
                    .map((run: any) => `tool  ${fitLine(renderToolRunLine(run), Math.max(24, width - 7))}`);
                const toolDetail = viewModel.highlightedToolRun ? renderToolDetail(viewModel.highlightedToolRun) : [];
                return [
                    ...toolRuns,
                    ...(toolDetail.length ? [`focus  ${fitLine(toolDetail[0], Math.max(24, width - 8))}`] : [])
                ];
            })()),
            ...(toolsPanelLines.length ? toolsPanelLines.slice(0, 1) : (viewModel.tools || []).length ? [`tools  ${(viewModel.tools || []).slice(0, 4).map((tool: any) => `${tool.name}${tool.active ? '' : ' [inactive]'}`).join(', ')}`] : [])
        ];
        const conversation = messages.slice(-messagesHeight);
        const context = contextLines.slice(-contextHeight);
        const bottom = composer.slice(-composerHeight);
        const nextRender = [
            '\x1b[2J\x1b[H',
            'tsdi-agent',
            '',
            ...(rendererLines.length ? rendererLines : [headerLine, subHeaderLine]),
            '',
            ...conversation,
            ...(context.length ? ['', ...context] : []),
            '',
            ...bottom
        ].join('\n');

        if (nextRender === lastRenderKey) {
            return;
        }
        lastRenderKey = nextRender;
        process.stdout.write(nextRender);
        refreshInputLine();
    };

    const processInput = async (input: string) => {
        const trimmed = resolveSlashCommand(input);
        if (!trimmed) return;
        const knownCommands = viewModel?.commandHints || getChatCommands();
        const buildPrompt = (value: string) => enrichPromptWithMentions(value, {
            workspace: resolved.workspace,
            sessionId,
            provider: currentProfile.provider,
            model: currentProfile.model,
            tools: viewModel?.tools || []
        });

        if (trimmed.startsWith('/') && !knownCommands.includes(trimmed)) {
            const matches = getMatchingSlashCommands(input);
            screenNotice = matches.length
                ? `Ambiguous command: ${input.trim()}  (${matches.join(', ')})`
                : `Unknown command: ${input.trim()}`;
            viewModel?.showNotice?.(screenNotice);
            renderScreen();
            safePrompt();
            return;
        }

        if (trimmed === '/quit' || trimmed === '/exit') {
            isClosed = true;
            process.stdout.write('\nGoodbye.\n');
            rl.close();
            return;
        }

        if (trimmed === '/help') {
            await viewModel.runCommand('/help');
            return;
        }

        if (trimmed === '/clear') {
            await viewModel.runCommand('/clear');
            return;
        }

        if (trimmed === '/multiline') {
            multilineMode = !multilineMode;
            if (!multilineMode) {
                draftLines = [];
            }
            screenNotice = multilineMode
                ? 'Multiline mode enabled. Type /send to submit, /cancel to discard.'
                : 'Multiline mode disabled.';
            viewModel?.showNotice?.(screenNotice);
            rl.setPrompt(multilineMode ? '\n... ' : '\n> ');
            renderScreen();
            safePrompt();
            return;
        }

        if (trimmed === '/cancel') {
            draftLines = [];
            multilineMode = false;
            rl.setPrompt('\n> ');
            screenNotice = 'Multiline draft cleared.';
            viewModel?.showNotice?.(screenNotice);
            renderScreen();
            safePrompt();
            return;
        }

        if (trimmed === '/tools') {
            await viewModel.runCommand('/tools');
            return;
        }

        if (trimmed === '/send') {
            if (!draftLines.length) {
                screenNotice = 'No multiline draft to send.';
                viewModel?.showNotice?.(screenNotice);
                renderScreen();
                safePrompt();
                return;
            }
            const draft = draftLines.join('\n');
            draftLines = [];
            multilineMode = false;
            rl.setPrompt('\n> ');
            try {
                screenNotice = '';
                viewModel?.clearNotice?.();
                viewModel.input = buildPrompt(draft);
                await viewModel.submit();
                renderScreen();
            } catch (error: any) {
                screenNotice = `Error: ${error.message}`;
                viewModel?.showNotice?.(screenNotice);
                renderScreen();
            }
            safePrompt();
            return;
        }

        if (trimmed === '/model') {
            await viewModel.runCommand('/model');
            return;
        }

        if (multilineMode) {
            draftLines.push(input);
            screenNotice = `Buffered ${draftLines.length} line${draftLines.length === 1 ? '' : 's'} in multiline draft.`;
            viewModel?.showNotice?.(screenNotice);
            renderScreen();
            safePrompt();
            return;
        }

        try {
            screenNotice = '';
            viewModel?.clearNotice?.();
            viewModel.input = buildPrompt(trimmed);
            await viewModel.submit();
            persistHistory();
            renderScreen();
        } catch (error: any) {
            screenNotice = `Error: ${error.message}`;
            viewModel?.showNotice?.(screenNotice);
            renderScreen();
        }
        safePrompt();
    };

    rl.on('line', (line: string) => {
        currentDraft = '';
        suggestionState = { items: [], selectedIndex: -1 };
        void processInput(line);
    });

    rl.on('history', () => {
        if (isClosed) {
            return;
        }
        if (modalPromptActive || isSelecting) {
            return;
        }
        syncCurrentDraft();
        renderScreen();
    });

    const rlInput = (rl as readline.Interface & { input?: NodeJS.ReadableStream }).input;
    stdinDataHandler = (chunk: Buffer | string) => {
        if (isClosed) {
            return;
        }
        if (isSelecting) {
            const mouse = parseTerminalMouseEvent(chunk);
            if (!mouse || mouse.release) {
                return;
            }
            const activeMenu = getActiveSelectMenu();
            if (!activeMenu) {
                return;
            }
            const selectedIndex = resolveSelectMenuOptionIndexFromRow(mouse.y, activeMenu.title, activeMenu.options.length);
            if (selectedIndex < 0) {
                return;
            }
            if (consoleState?.selectMenu) {
                void consoleState.chooseSelectMenuIndex(selectedIndex);
            } else if (selectMenu) {
                selectMenu.resolve(selectMenu.options[selectedIndex]?.value);
            }
            return;
        }
        if (modalPromptActive) {
            return;
        }
        syncCurrentDraft();
        const token = getActiveInputToken(currentDraft);
        if (!inputLocked && (multilineMode || token.startsWith('/') || token.startsWith('@'))) {
            renderScreen();
        }
    };
    rlInput?.on('data', stdinDataHandler);
    readline.emitKeypressEvents(process.stdin, rl);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode?.(true);
        process.stdout.write('\x1b[?1000h\x1b[?1006h');
    }
    keypressHandler = (_str, key) => {
        if (isClosed) {
            return;
        }
        if (getActiveSelectMenu()) {
            if (key?.name === 'down') {
                if (consoleState?.selectMenu) {
                    consoleState.moveSelectMenu(1);
                } else if (selectMenu) {
                    selectMenu.selectedIndex = (selectMenu.selectedIndex + 1) % selectMenu.options.length;
                }
                renderSelectionNotice();
                return;
            }
            if (key?.name === 'up') {
                if (consoleState?.selectMenu) {
                    consoleState.moveSelectMenu(-1);
                } else if (selectMenu) {
                    selectMenu.selectedIndex = (selectMenu.selectedIndex - 1 + selectMenu.options.length) % selectMenu.options.length;
                }
                renderSelectionNotice();
                return;
            }
            if (key?.name === 'return') {
                if (consoleState?.selectMenu) {
                    void consoleState.confirmSelectMenu();
                } else if (selectMenu) {
                    selectMenu.resolve(selectMenu.options[selectMenu.selectedIndex]?.value);
                }
                return;
            }
            if (key?.name === 'escape' || key?.name === 'q') {
                if (consoleState?.selectMenu) {
                    void consoleState.cancelSelectMenu();
                } else if (selectMenu) {
                    selectMenu.resolve(undefined);
                }
                return;
            }
            if (_str && /^[1-9]$/.test(_str)) {
                const index = parseInt(_str, 10) - 1;
                const activeMenu = getActiveSelectMenu();
                if (activeMenu && index >= 0 && index < activeMenu.options.length) {
                    if (consoleState?.selectMenu) {
                        void consoleState.chooseSelectMenuIndex(index);
                    } else if (selectMenu) {
                        selectMenu.resolve(selectMenu.options[index]?.value);
                    }
                }
                return;
            }
            return;
        }
        if (modalPromptActive || inputLocked || !hasInteractiveSuggestions()) {
            return;
        }
        if (key?.name === 'down') {
            suggestionState = moveSuggestionSelection(suggestionState, 1);
            renderScreen();
        } else if (key?.name === 'up') {
            suggestionState = moveSuggestionSelection(suggestionState, -1);
            renderScreen();
        } else if (key?.name === 'return' && shouldAcceptSuggestionOnEnter((rl as any).line || '', suggestionState)) {
            const selected = suggestionState.items[suggestionState.selectedIndex];
            const nextInput = applySuggestionToInput((rl as any).line || '', selected.value);
            (rl as any).line = nextInput;
            currentDraft = nextInput;
            suggestionState = { items: [], selectedIndex: -1 };
            renderScreen();
            return;
        } else if (key?.name === 'tab' && suggestionState.selectedIndex >= 0) {
            const selected = suggestionState.items[suggestionState.selectedIndex];
            const nextInput = applySuggestionToInput((rl as any).line || '', selected.value);
            (rl as any).line = nextInput;
            currentDraft = nextInput;
            suggestionState = { items: [], selectedIndex: -1 };
            renderScreen();
        }
    };
    process.stdin.on('keypress', keypressHandler);

    resizeHandler = () => {
        if (isClosed) {
            return;
        }
        if (isSelecting) {
            renderSelectionNotice();
            return;
        }
        renderScreen();
    };
    process.stdout.on('resize', resizeHandler);

    sigintHandler = () => {
        if (isClosed) {
            return;
        }
        isClosed = true;
        rl.close();
    };
    process.on('SIGINT', sigintHandler);

    rl.on('close', async () => {
        if (stdinDataHandler && rlInput) {
            rlInput.off('data', stdinDataHandler);
            stdinDataHandler = null;
        }
        if (keypressHandler) {
            process.stdin.off('keypress', keypressHandler as any);
            keypressHandler = null;
        }
        if (resizeHandler) {
            process.stdout.off('resize', resizeHandler);
            resizeHandler = null;
        }
        if (sigintHandler) {
            process.off('SIGINT', sigintHandler);
            sigintHandler = null;
        }
        if (process.stdin.isTTY) {
            process.stdout.write('\x1b[?1000l\x1b[?1006l');
            process.stdin.setRawMode?.(false);
        }
        if (isClosed && !currentCtx && !viewModel && !unsubscribeVm) {
            process.exit(0);
            return;
        }
        isClosed = true;
        process.stdout.write('\nClosing session...\n');
        persistHistory();
        if (unsubscribeVm) {
            unsubscribeVm();
            unsubscribeVm = null;
        }
        viewModel?.dispose?.();
        viewModel = null;
        if (currentCtx) {
            await currentCtx.close();
            currentCtx = null;
        }
        process.exit(0);
    });

    const spinnerTimer = setInterval(() => {
        if (isClosed || modalPromptActive || !viewModel || inputLocked) {
            return;
        }
        if (viewModel.runningTools?.length || viewModel.status === 'running' || viewModel.status === 'reasoning') {
            spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
            renderScreen();
        }
    }, 120);

    currentCtx?.onDestroy?.(() => clearInterval(spinnerTimer));
    renderScreen();
    safePrompt();
}

if (require.main === module) {
    const argv = process.argv.length <= 2
        ? [...process.argv, 'chat']
        : process.argv;
    void createAgentCli().parseAsync(argv);
}

export {
    createAgentCli
};
