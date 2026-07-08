#!/usr/bin/env node
import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fitByDisplayWidth, getDisplayWidth } from '@tsdi/components/console';
import { runAgentApplication, runAgentPrompt, runAgentStreaming } from './run-command';
import { AgentCliProviderProfile, ensureAgentWorkspaceConfig, resolveCliConfig, resolveCliModelConfig, resolveProviderApiKeyEnv, resolveProviderBaseUrl, writeSettingsModelProfile } from './config';
import {
    applySuggestionToInput,
    applyTerminalInputChunk,
    buildMentionCandidates,
    enrichPromptWithMentions,
    findSelectMenuOptionIndexFromRenderedLines,
    fitLine,
    formatDisplayDraft,
    getActiveInputToken,
    getChatCommands,
    isSuggestionMenu,
    moveSuggestionSelection,
    normalizeSuggestionState,
    parseTerminalMouseEvent,
    resolveUniqueCommandPrefix,
    resolveInputSuggestions,
    shouldAcceptSuggestionOnEnter,
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

const ANSI = {
    reset: '\x1b[0m',
    red: '\x1b[31m'
} as const;

export function findInputPromptRow(lines: string[]): number {
    for (let index = lines.length - 1; index >= 0; index--) {
        const line = lines[index];
        const promptColumn = line.indexOf('> ');
        if (promptColumn < 0) {
            continue;
        }
        const beforePrompt = line.slice(0, promptColumn).trim();
        if (beforePrompt === '│' || beforePrompt === '') {
            return index;
        }
    }
    return -1;
}

export function getTerminalDisplayWidth(value: string): number {
    return getDisplayWidth(value);
}

export function fitTerminalAnsiLine(line: string, width: number): string {
    return fitAnsiLine(line, width);
}

function stripAnsi(value: string): string {
    return value.replace(/\x1b\[[0-9;]*m/g, '');
}

function fitAnsiLine(line: string, width: number): string {
    const plain = stripAnsi(line);
    if (getDisplayWidth(plain) <= width) {
        return line;
    }
    return fitByDisplayWidth(plain, width);
}

class ChatExitRequest extends Error {
    constructor() {
        super('CHAT_EXIT_REQUEST');
    }
}

interface SelectMenuOption {
    label: string;
    value: string;
    description?: string;
    detail?: string;
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
        AgentConsoleComponent, AgentConsoleSessionState, AgentUiModule
    } = require('@tsdi/agent');
    const { ComponentFactory } = require('@tsdi/components');
    const { ConsoleRenderer, TuiRenderer } = require('@tsdi/components/console');

    const resolved = resolveCliConfig(options);
    ensureAgentWorkspaceConfig(resolved.root, path.basename(resolved.workspace));
    const historyPath = path.join(resolved.root, HISTORY_FILE);

    const sessionId = resolved.sessionId;
    let currentProfile = resolveCliModelConfig(options, resolved.root);
    let currentCtx: any = null;
    let runtime: any = null;
    let toolRegistry: any = null;
    let viewModel: any = null;
    let consoleState: any = null;
    let consoleRenderer: any = null;
    let consoleComponentRef: any = null;
    let selectPanelRef: any = null;
    let renderTimer: NodeJS.Timeout | null = null;
    let inputLocked = false;
    let lastRenderKey = '';
    let lastRenderedLines: string[] = [];
    let screenNotice = '';
    let spinnerIndex = 0;
    let multilineMode = false;
    let draftLines: string[] = [];
    let currentDraft = '';
    let draftCursor = 0;
    let isClosed = false;
    let modalPromptActive = false;
    let selectMenu: SelectMenuState | null = null;
    let suggestionState: SuggestionState = { items: [], selectedIndex: -1 };
    let activeTextPrompt: { question: string; resolve: (value: string) => void; previousLocked: boolean } | null = null;
    let isSelecting = false;
    let stdinDataHandler: ((chunk: Buffer | string) => void) | null = null;
    let keypressHandler: ((str: string, key: readline.Key) => void) | null = null;
    let resizeHandler: (() => void) | null = null;
    let sigintHandler: (() => void) | null = null;
    let historyEntries: string[] = [];
    let historyIndex = -1;
    let historyDraft = '';
    let isCleaningUp = false;
    const syncSuggestionMenu = () => {
        const activeMenu = consoleState?.selectMenu;
        if (activeMenu && !isSuggestionMenu(activeMenu)) {
            return;
        }
        const activeToken = getActiveInputToken(currentDraft);
        const items = resolveInputSuggestions(
            currentDraft,
            viewModel?.commandHints || getChatCommands(),
            buildMentionCandidates((viewModel?.tools || []).map((tool: any) => tool.name))
        );
        suggestionState = normalizeSuggestionState(items, suggestionState.selectedIndex >= 0 ? suggestionState.selectedIndex : 0);
        const shouldShow = !!activeToken && (activeToken.startsWith('/') || activeToken.startsWith('@')) && suggestionState.items.length > 0;
        if (!shouldShow) {
            if (isSuggestionMenu(consoleState?.selectMenu)) {
                consoleState.closeSelectMenu();
            }
            return;
        }
        const options = suggestionState.items.map(item => ({
            label: item.label,
            value: item.value
        }));
        consoleState?.openSelectMenu?.('Suggestions', options, Math.max(0, suggestionState.selectedIndex), 'tab/enter accept   up/down move');
    };

    const setDraftDisplay = () => {
        consoleState?.setInput?.(formatDisplayDraft(currentDraft, draftCursor));
        syncSuggestionMenu();
    };

    const getActiveSelectMenu = (): { title: string; hint?: string; options: SelectMenuOption[]; selectedIndex: number } | undefined => {
        if (consoleState?.selectMenu) {
            return consoleState.selectMenu;
        }
        return selectMenu || undefined;
    };

    const safePrompt = (_preserveCursor = false) => {
        if (isClosed) {
            return;
        }
        renderScreen();
    };

    const refreshInputLine = () => {
        if (isClosed) {
            return;
        }
        setDraftDisplay();
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
        const unique = Array.from(new Set(historyEntries.filter(Boolean)));
        fs.writeFileSync(historyPath, JSON.stringify(unique.slice(-200), null, 2) + '\n', 'utf8');
    };

    historyEntries = loadHistory();

    const promptLine = (question: string): Promise<string> => new Promise(resolve => {
        const previousLocked = inputLocked;
        inputLocked = true;
        modalPromptActive = true;
        isSelecting = false;
        selectMenu = null;
        consoleState?.closeSelectMenu?.();
        historyIndex = -1;
        historyDraft = '';
        suggestionState = { items: [], selectedIndex: -1 };
        activeTextPrompt = {
            question,
            previousLocked,
            resolve: (answer: string) => {
                inputLocked = previousLocked;
                modalPromptActive = false;
                activeTextPrompt = null;
                currentDraft = '';
                draftCursor = 0;
                resolve(answer.trim());
            }
        };
        updateDraftState('', 0);
        renderScreen();
    });

    const pauseReadlineForSelection = () => {
        if (isClosed) {
            return;
        }
        isSelecting = true;
    };

    const resumeReadlineAfterSelection = () => {
        if (isClosed) {
            return;
        }
        isSelecting = false;
        renderScreen();
        safePrompt();
    };

    const beginSelectInteraction = () => {
        const previousLocked = inputLocked;
        inputLocked = true;
        modalPromptActive = true;
        historyIndex = -1;
        historyDraft = '';
        suggestionState = { items: [], selectedIndex: -1 };
        updateDraftState('', 0);
        pauseReadlineForSelection();
        let finished = false;
        return () => {
            if (finished) {
                return;
            }
            finished = true;
            selectMenu = null;
            modalPromptActive = false;
            inputLocked = previousLocked;
            currentDraft = '';
            draftCursor = 0;
            consoleState?.closeSelectMenu?.();
            resumeReadlineAfterSelection();
        };
    };

    const showSelectMenu = (title: string, options: SelectMenuOption[], initialIndex = 0, hint = '1-9 select   up/down move   enter confirm   q cancel'): Promise<string | undefined> => {
        return new Promise(resolve => {
            selectMenu = {
                title,
                hint,
                options,
                selectedIndex: Math.max(0, Math.min(options.length - 1, initialIndex)),
                resolve: (value: string | undefined) => {
                    selectMenu = null;
                    if (consoleState?.selectMenuAction === resolveSelection) {
                        consoleState.selectMenuAction = undefined;
                    }
                    consoleState?.closeSelectMenu?.();
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

    const promptSelect = async (title: string, options: SelectMenuOption[], initialIndex = 0, hint = '1-9 select   up/down move   enter confirm   q cancel'): Promise<string | undefined> => {
        const finishSelectInteraction = beginSelectInteraction();
        try {
            return await showSelectMenu(title, options, initialIndex, hint);
        } finally {
            finishSelectInteraction();
        }
    };

    const updateDraftState = (nextDraft: string, cursor = nextDraft.length) => {
        currentDraft = nextDraft;
        draftCursor = Math.max(0, Math.min(cursor, currentDraft.length));
        setDraftDisplay();
    };

    const applyChunkToDraft = (chunk: Buffer | string) => {
        const next = applyTerminalInputChunk(currentDraft, draftCursor, chunk);
        currentDraft = next.value;
        draftCursor = next.cursor;
        setDraftDisplay();
    };

    const renderSelectionNotice = () => {
        if (isClosed) {
            return;
        }
        renderScreen();
    };

    const hasInteractiveSuggestions = (): boolean => {
        const token = getActiveInputToken(currentDraft);
        return !!token && (token.startsWith('/') || token.startsWith('@')) && suggestionState.items.length > 0;
    };

    const scheduleDraftRefresh = () => {
        if (isClosed || isSelecting || inputLocked) {
            return;
        }
        Promise.resolve().then(() => {
            if (isClosed || isSelecting || inputLocked) {
                return;
            }
            renderScreen();
        });
    };

    const applySuggestionValue = (value?: string): void => {
        if (!value) {
            return;
        }
        const nextInput = applySuggestionToInput(currentDraft, value);
        suggestionState = { items: [], selectedIndex: -1 };
        updateDraftState(nextInput, nextInput.length);
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
            value: item.provider,
            detail: [
                `Provider: ${item.provider}`,
                `Default model: ${PROVIDER_DEFAULT_MODELS[item.provider] || 'custom-model'}`,
                `Base URL: ${resolveProviderBaseUrl(item.provider) || '(custom)'}`
            ].join('\n')
        }));
        const currentProviderIndex = Math.max(0, MODEL_PROVIDER_CHOICES.findIndex(item => item.provider === current?.provider));
        const finishSelectInteraction = beginSelectInteraction();
        let selectInteractionClosed = false;
        const closeSelectInteraction = () => {
            if (selectInteractionClosed) {
                return;
            }
            selectInteractionClosed = true;
            finishSelectInteraction();
        };
        try {
            const provider = await showSelectMenu('Model providers', providerOptions, currentProviderIndex);
            if (!provider) {
                return undefined;
            }
            const providerSelection = MODEL_PROVIDER_CHOICES.find(item => item.provider === provider) || MODEL_PROVIDER_CHOICES[0];
            const models = PROVIDER_MODELS[provider] || [];

            let model = getProviderScopedValue(provider, 'model') || PROVIDER_DEFAULT_MODELS[provider];
            if (models.length) {
                const modelOptions = models.map(item => ({
                    label: item,
                    value: item,
                    detail: [
                        `Provider: ${providerSelection.label}`,
                        `Model: ${item}`,
                        `API key env: ${getProviderScopedValue(provider, 'apiKeyEnv') || '-'}`
                    ].join('\n')
                }));
                const currentModelIndex = Math.max(0, models.indexOf(model));
                const selectedModel = await showSelectMenu(`Models for ${providerSelection.label}`, modelOptions, currentModelIndex);
                if (!selectedModel) {
                    return undefined;
                }
                model = selectedModel;
            } else {
                closeSelectInteraction();
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
                closeSelectInteraction();
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
        } finally {
            closeSelectInteraction();
        }
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
        const componentFactory = currentCtx.get(ComponentFactory);
        consoleComponentRef = componentFactory.create(AgentConsoleComponent, { injector: currentCtx });
        viewModel = consoleComponentRef.instance;
        viewModel.configure({
            sessionId,
            provider: profile.provider,
            model: profile.model,
            workspace: resolved.workspace
        });
        await consoleComponentRef.render();
        consoleState = viewModel.sessionState || consoleComponentRef.injector.get(AgentConsoleSessionState);
        consoleRenderer = currentCtx.get(TuiRenderer) || currentCtx.get(ConsoleRenderer);
        const runnerRef = consoleComponentRef;
        selectPanelRef = runnerRef?.hostView?.query?.('agent-console-select-panel') || null;
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
        });
        viewModel.setCommandAction('/clear', async () => {
            screenNotice = '';
            viewModel?.clearNotice?.();
            renderScreen();
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
        });
        viewModel.setCommandAction('/model', async () => {
            inputLocked = true;
            currentDraft = '';
            draftCursor = 0;
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
                    await cleanupAndExit();
                    return;
                }
                screenNotice = `Error: ${error.message}`;
                viewModel?.showNotice?.(screenNotice);
            } finally {
                inputLocked = false;
                renderScreen();
            }
        });
        currentProfile = profile;
    };

    const cleanupAndExit = async () => {
        if (isCleaningUp) {
            return;
        }
        isCleaningUp = true;
        if (stdinDataHandler) {
            process.stdin.off('data', stdinDataHandler as any);
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
        if (renderTimer) {
            clearInterval(renderTimer);
            renderTimer = null;
        }
        if (process.stdin.isTTY) {
            process.stdout.write('\x1b[?1000l\x1b[?1006l\x1b[2J\x1b[H\x1b[?1049l');
            process.stdin.setRawMode?.(false);
        }
        persistHistory();
        viewModel?.dispose?.();
        viewModel = null;
        consoleComponentRef = null;
        if (currentCtx) {
            await currentCtx.close();
            currentCtx = null;
        }
        process.stdout.write('\nClosing session...\n');
        process.exit(0);
    };

    try {
        currentProfile = await ensureInteractiveProfile();
        await createChatContext(currentProfile);
    } catch (error: any) {
        if (error instanceof ChatExitRequest) {
            isClosed = true;
            await cleanupAndExit();
            return;
        }
        process.stdout.write(`${error.message}\n`);
        isClosed = true;
        await cleanupAndExit();
        return;
    }

    const renderScreen = () => {
        if (isClosed || !viewModel || !consoleRenderer || !consoleComponentRef?.hostView?.rootNodes?.length) {
            return;
        }
        const width = Math.max(72, (process.stdout.columns || 100) - 2);
        const spinner = SPINNER_FRAMES[spinnerIndex % SPINNER_FRAMES.length];
        const runningTools = viewModel.runningTools?.length
            ? `${spinner} ${viewModel.runningTools.join(', ')}`
            : 'idle';
        if (consoleState?.setStatus) {
            consoleState.setStatus(viewModel.status);
        }
        if (screenNotice) {
            viewModel?.showNotice?.(screenNotice);
        }
        const rootNodes = consoleComponentRef.hostView.rootNodes;
        const rendered = typeof consoleRenderer.renderToTuiLines === 'function'
            ? consoleRenderer.renderToTuiLines(rootNodes, { width: Math.max(24, width) })
            : consoleRenderer.renderToLines(rootNodes);
        lastRenderedLines = rendered.slice();
        const nextRender = `\x1b[2J\x1b[H${rendered.map((line: string) => fitAnsiLine(line, width)).join('\n')}`;

        if (nextRender === lastRenderKey) {
            return;
        }
        lastRenderKey = nextRender;
        process.stdout.write(nextRender);
        placeTerminalCursor(rendered, width);
    };

    const placeTerminalCursor = (rendered: string[], width: number) => {
        if (!process.stdout.isTTY || isSelecting || inputLocked || modalPromptActive) {
            return;
        }
        const plainLines = rendered.map((line: string) => stripAnsi(line));
        const promptRow = findInputPromptRow(plainLines);
        if (promptRow < 0) {
            return;
        }
        const promptColumn = plainLines[promptRow].indexOf('> ');
        if (promptColumn < 0) {
            return;
        }
        const draftWidth = getDisplayWidth(currentDraft.slice(0, draftCursor));
        const cursorColumn = Math.min(width, promptColumn + 2 + draftWidth) + 1;
        const cursorRow = promptRow + 1;
        process.stdout.write(`\x1b[${cursorRow};${cursorColumn}H`);
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
            await cleanupAndExit();
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
            renderScreen();
            safePrompt();
            return;
        }

        if (trimmed === '/cancel') {
            draftLines = [];
            multilineMode = false;
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
            pushHistoryEntry(trimmed);
            persistHistory();
            renderScreen();
        } catch (error: any) {
            screenNotice = `Error: ${error.message}`;
            viewModel?.showNotice?.(screenNotice);
            renderScreen();
        }
        safePrompt();
    };

    const pushHistoryEntry = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
            return;
        }
        historyEntries = [trimmed, ...historyEntries.filter(item => item !== trimmed)].slice(0, 200);
        historyIndex = -1;
        historyDraft = '';
    };

    const navigateHistory = (delta: number) => {
        if (!historyEntries.length) {
            return;
        }
        if (delta < 0) {
            if (historyIndex === -1) {
                historyDraft = currentDraft;
                historyIndex = 0;
            } else if (historyIndex < historyEntries.length - 1) {
                historyIndex += 1;
            }
        } else {
            if (historyIndex === -1) {
                return;
            }
            if (historyIndex === 0) {
                historyIndex = -1;
                updateDraftState(historyDraft, historyDraft.length);
                renderScreen();
                return;
            }
            historyIndex -= 1;
        }
        const next = historyEntries[historyIndex] || '';
        updateDraftState(next, next.length);
        renderScreen();
    };

    const resolveTextPrompt = (value: string) => {
        const prompt = activeTextPrompt;
        if (!prompt) {
            return;
        }
        prompt.resolve(value);
        renderScreen();
    };

    const submitCurrentDraft = async () => {
        const line = currentDraft;
        historyIndex = -1;
        historyDraft = '';
        suggestionState = { items: [], selectedIndex: -1 };
        updateDraftState('', 0);
        await processInput(line);
    };

    const setActiveMenuIndex = (index: number) => {
        const activeMenu = getActiveSelectMenu();
        if (!activeMenu) {
            return;
        }
        const nextIndex = Math.max(0, Math.min(activeMenu.options.length - 1, index));
        if (consoleState?.selectMenu) {
            consoleState.setSelectMenuIndex(nextIndex);
        }
        if (selectMenu) {
            selectMenu.selectedIndex = nextIndex;
        }
        renderSelectionNotice();
    };

    const moveActiveMenu = (delta: number) => {
        const activeMenu = getActiveSelectMenu();
        if (!activeMenu || !activeMenu.options.length) {
            return;
        }
        const nextIndex = (activeMenu.selectedIndex + delta + activeMenu.options.length) % activeMenu.options.length;
        setActiveMenuIndex(nextIndex);
    };

    const confirmActiveMenuSelection = () => {
        const activeMenu = getActiveSelectMenu();
        if (!activeMenu) {
            return;
        }
        if (consoleState?.selectMenu) {
            void consoleState.confirmSelectMenu();
            return;
        }
        if (selectMenu) {
            selectMenu.resolve(selectMenu.options[selectMenu.selectedIndex]?.value);
        }
    };

    const cancelActiveMenuSelection = () => {
        if (consoleState?.selectMenu) {
            void consoleState.cancelSelectMenu();
            return;
        }
        if (selectMenu) {
            selectMenu.resolve(undefined);
        }
    };

    const confirmActiveMenuIndex = (index: number) => {
        const activeMenu = getActiveSelectMenu();
        if (!activeMenu || index < 0 || index >= activeMenu.options.length) {
            return;
        }
        if (consoleState?.selectMenu && selectMenu) {
            selectMenu.selectedIndex = index;
        }
        if (consoleState?.selectMenu) {
            void consoleState.chooseSelectMenuIndex(index);
            return;
        }
        if (selectMenu) {
            selectMenu.selectedIndex = index;
            selectMenu.resolve(selectMenu.options[index]?.value);
        }
    };

    stdinDataHandler = (chunk: Buffer | string) => {
        if (isClosed) {
            return;
        }
        if (isSelecting) {
            const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
            const mouse = parseTerminalMouseEvent(chunk);
            if (mouse && !mouse.release) {
                const activeMenu = getActiveSelectMenu();
                if (!activeMenu) {
                    return;
                }
                const index = findSelectMenuOptionIndexFromRenderedLines(
                    lastRenderedLines,
                    activeMenu.title,
                    activeMenu.options.length,
                    mouse.y
                );
                if (index >= 0) {
                    confirmActiveMenuIndex(index);
                }
                return;
            }
            if (text === '\u001b[A') {
                moveActiveMenu(-1);
                return;
            }
            if (text === '\u001b[B') {
                moveActiveMenu(1);
                return;
            }
            if (text === '\r' || text === '\n') {
                confirmActiveMenuSelection();
                return;
            }
            if (text === '\u001b' || text.toLowerCase() === 'q') {
                cancelActiveMenuSelection();
                return;
            }
            if (/^[1-9]$/.test(text)) {
                const index = parseInt(text, 10) - 1;
                confirmActiveMenuIndex(index);
            }
            return;
        }
        applyChunkToDraft(chunk);
        if (!inputLocked) {
            scheduleDraftRefresh();
        }
    };
    process.stdin.on('data', stdinDataHandler);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();
    if (process.stdin.isTTY) {
        process.stdout.write('\x1b[?1049h');
        process.stdin.setRawMode?.(true);
        process.stdout.write('\x1b[?1000h\x1b[?1006h');
    }
    keypressHandler = (_str, key) => {
        if (isClosed) {
            return;
        }
        if (key?.ctrl && key.name === 'c') {
            isClosed = true;
            void cleanupAndExit();
            return;
        }
        const activeMenu = getActiveSelectMenu();
        if (activeMenu && !isSuggestionMenu(activeMenu)) {
            // Selection menus are handled directly from raw stdin chunks.
            return;
        }
        if (activeTextPrompt && key?.name === 'return') {
            resolveTextPrompt(currentDraft);
            return;
        }
        if (!modalPromptActive && !inputLocked && !hasInteractiveSuggestions() && key?.name === 'up') {
            navigateHistory(-1);
            return;
        }
        if (!modalPromptActive && !inputLocked && !hasInteractiveSuggestions() && key?.name === 'down') {
            navigateHistory(1);
            return;
        }
        if (modalPromptActive || inputLocked || !hasInteractiveSuggestions()) {
            if (!modalPromptActive && !inputLocked && key?.name === 'return') {
                void submitCurrentDraft();
                return;
            }
            const isEditableKey = key?.name === 'backspace'
                || key?.name === 'delete'
                || key?.name === 'left'
                || key?.name === 'right'
                || key?.name === 'home'
                || key?.name === 'end'
                || (!!_str && !key?.ctrl && !key?.meta && key?.name !== 'return' && key?.name !== 'tab');
            if (isEditableKey) {
                scheduleDraftRefresh();
            }
            return;
        }
        if (key?.name === 'down') {
            suggestionState = moveSuggestionSelection(suggestionState, 1);
            if (consoleState?.selectMenu?.title === 'Suggestions') {
                consoleState.setSelectMenuIndex(suggestionState.selectedIndex);
            }
            renderScreen();
        } else if (key?.name === 'up') {
            suggestionState = moveSuggestionSelection(suggestionState, -1);
            if (consoleState?.selectMenu?.title === 'Suggestions') {
                consoleState.setSelectMenuIndex(suggestionState.selectedIndex);
            }
            renderScreen();
        } else if (key?.name === 'return' && shouldAcceptSuggestionOnEnter(currentDraft, suggestionState)) {
            const selected = suggestionState.items[suggestionState.selectedIndex];
            const nextInput = applySuggestionToInput(currentDraft, selected.value);
            suggestionState = { items: [], selectedIndex: -1 };
            if (consoleState?.selectMenu?.title === 'Suggestions') {
                consoleState.closeSelectMenu();
            }
            updateDraftState(nextInput, nextInput.length);
            renderScreen();
            return;
        } else if (key?.name === 'return') {
            void submitCurrentDraft();
            return;
        } else if (key?.name === 'tab' && suggestionState.selectedIndex >= 0) {
            const selected = suggestionState.items[suggestionState.selectedIndex];
            const nextInput = applySuggestionToInput(currentDraft, selected.value);
            suggestionState = { items: [], selectedIndex: -1 };
            if (consoleState?.selectMenu?.title === 'Suggestions') {
                consoleState.closeSelectMenu();
            }
            updateDraftState(nextInput, nextInput.length);
            renderScreen();
        }
        const isEditableKey = key?.name === 'backspace'
            || key?.name === 'delete'
            || key?.name === 'left'
            || key?.name === 'right'
            || key?.name === 'home'
            || key?.name === 'end'
            || (!!_str && !key?.ctrl && !key?.meta && key?.name !== 'return' && key?.name !== 'tab');
        if (isEditableKey) {
            scheduleDraftRefresh();
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
        void cleanupAndExit();
    };
    process.on('SIGINT', sigintHandler);

    renderTimer = setInterval(() => {
        if (isClosed || !viewModel) {
            return;
        }
        if (!modalPromptActive && !inputLocked
            && (viewModel.runningTools?.length || viewModel.status === 'running' || viewModel.status === 'reasoning')) {
            spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
        }
        if (!isSelecting) {
            renderScreen();
        }
    }, 80);

    currentCtx?.onDestroy?.(() => {
        if (renderTimer) {
            clearInterval(renderTimer);
            renderTimer = null;
        }
    });
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
