#!/usr/bin/env node
import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import {
    getDisplayWidth,
    formatConsoleIndexedOptionLabel,
    resolveConsolePlaceholderDisplayValue,
    resolveConsoleRawKeypressSuppressionKey,
    resolveConsoleSelectDetailLines,
    resolveConsoleSelectWindow,
    shouldSkipConsoleHistoryEntry,
    shouldPlaceConsoleCursor,
    shouldRenderConsoleTranscript,
    shouldRouteConsoleDraftNavigation,
    shouldSuppressConsoleDuplicatedKeypress,
    shouldSubmitConsoleTextChunk,
    sliceByDisplayWidth,
    applyTerminalInputChunk,
    buildClearScreenSequence,
    buildTerminalCleanupSequence,
    buildTerminalCursorSequence,
    composePrimaryTerminalScreen,
    composeTerminalScreenSections,
    findSelectMenuOptionIndexFromRenderedLines,
    getChatCommands,
    handleTerminalMenuKey,
    isSuggestionMenu,
    parseTerminalMouseEvent,
    renderPrimaryTerminalScreen,
    TerminalInputSequenceDecoder,
    resolveTerminalMenuNextIndex,
    resolveTerminalMenuInputKey,
    parseTerminalInputControlKey,
    TerminalPrimaryRenderState,
    shouldUseAlternateScreen,
    wrapTerminalText,
    wrapPrefixedText,
    parseTerminalTextPromptChunk,
    compactRenderedLines,
    windowRenderedLinesFromBottom,
    windowRenderedBlocksFromBottomWithContext,
    compactRenderedBlocksWindow,
    compactRenderedBlocks,
    buildOsc52ClipboardSequence,
    TerminalRenderedWindow,
    DEFAULT_TERMINAL_APP_TITLE,
    DEFAULT_CONSOLE_SELECT_HINT,
    buildTerminalBrandBlock,
    formatTerminalStatusFooter,
    renderTerminalMarkdownLines,
    renderTerminalBlock,
    renderTerminalBlockLines,
    resolveTerminalSize
} from '@tsdi/components/console';
import { runAgentApplication, runAgentPrompt, runAgentStreaming } from './run-command';
import { AgentCliProviderProfile } from './config';
import { CliAgentUiConfigReader } from './agent-ui-config-reader';
import { TerminalConsoleUiDelegate } from './terminal-ui-delegate';
import { AgentUiConfigService, defaultAgentConsoleOptions } from '@tsdi/agent';

const configReader = new CliAgentUiConfigReader();

const HISTORY_FILE = 'chat-history.json';
const CLI_VERSION = '6.0.31';
const DEFAULT_CONSOLE_OPTIONS = defaultAgentConsoleOptions;
const SPINNER_FRAMES = Array.from({ length: 14 }, (_value, index) => String(Math.floor(index / 2)));
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
const PROVIDER_STRONG_MODELS: Record<string, string> = {
    deepseek: 'deepseek-v4-pro',
    openai: 'gpt-4.1',
    'openai-compatible': 'custom-model',
    anthropic: 'claude-sonnet-4-20250514'
};

const ANSI = {
    reset: '\x1b[0m',
    red: '\x1b[38;2;248;81;73m',
    dim: '\x1b[38;2;110;118;129m',
    muted: '\x1b[38;2;88;95;104m',
    text: '\x1b[38;2;201;209;217m',
    blue: '\x1b[38;2;121;192;255m',
    blueStrong: '\x1b[1m\x1b[38;2;143;208;255m',
    green: '\x1b[1m\x1b[38;2;126;231;135m',
    amber: '\x1b[38;2;255;184;107m',
    bg: '\x1b[48;2;27;33;40m',
    bgSelected: '\x1b[48;2;19;32;43m',
    bgUser: '\x1b[48;2;26;37;31m'
} as const;

function stripAnsi(value: string): string {
    return value.replace(/\x1b\[[0-9;]*m/g, '');
}

function fitAnsiLine(line: string, width: number): string {
    const plain = stripAnsi(line);
    if (getDisplayWidth(plain) <= width) {
        return line;
    }
    return sliceByDisplayWidth(plain, width);
}

function paint(value: string, ...codes: string[]): string {
    const prefix = codes.filter(Boolean).join('');
    return prefix ? `${prefix}${value}${ANSI.reset}` : value;
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

export interface SessionRestoreCandidate {
    id: string;
    updatedAt?: number;
    messageCount?: number;
}

interface ParsedSlashCommandLine {
    raw: string;
    command: string;
    args: string;
}

function sanitizeSessionId(value: string): string {
    return value
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
}

export function buildChatSessionId(seed?: string): string {
    const sanitized = sanitizeSessionId(seed || '');
    if (sanitized) {
        return sanitized;
    }
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
    return `chat-${timestamp.toLowerCase()}`;
}

export function pickRestoredSessionId(
    preferredId: string,
    sessions: SessionRestoreCandidate[],
    preservePreferred = false
): string {
    if (preservePreferred) {
        return preferredId;
    }
    const current = sessions.find(item => item.id === preferredId);
    if ((current?.messageCount || 0) > 0) {
        return preferredId;
    }
    const ranked = sessions
        .slice()
        .sort((left, right) => {
            const leftHasMessages = (left.messageCount || 0) > 0 ? 1 : 0;
            const rightHasMessages = (right.messageCount || 0) > 0 ? 1 : 0;
            if (leftHasMessages !== rightHasMessages) {
                return rightHasMessages - leftHasMessages;
            }
            return (right.updatedAt || 0) - (left.updatedAt || 0);
        });
    return ranked[0]?.id || preferredId;
}

export function parseSlashCommandLine(input: string): ParsedSlashCommandLine {
    const raw = input.trim();
    if (!raw.startsWith('/')) {
        return {
            raw,
            command: raw,
            args: ''
        };
    }
    const spaceIndex = raw.indexOf(' ');
    if (spaceIndex < 0) {
        return {
            raw,
            command: raw,
            args: ''
        };
    }
    return {
        raw,
        command: raw.slice(0, spaceIndex),
        args: raw.slice(spaceIndex + 1).trim()
    };
}

function createAgentCli(): Command {
    const program = new Command();
    program.name('tsdi-agent');
    program.version(CLI_VERSION);

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
            const resolved = new AgentUiConfigService(configReader, options).resolve();
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
        AgentRuntime, mergeAgentOptions, ToolRegistry, SessionStore, ToolApprovalManager,
        AgentConsoleActivityPanelComponent,
        AgentConsoleComponent,
        AgentConsoleInputPanelComponent,
        AgentConsoleMessageDetailPanelComponent,
        AgentConsoleMessagesPanelComponent,
        AgentConsoleSelectPanelComponent,
        AgentConsoleSessionState,
        AgentConsoleSessionsPanelComponent,
        AgentConsoleStatusPanelComponent,
        AgentConsoleToolRunsPanelComponent,
        AgentConsoleToolsPanelComponent,
        AgentConsoleWorkingPanelComponent,
        AgentUiModule
    } = require('@tsdi/agent');
    const { ConsoleRenderer, TuiRenderer } = require('@tsdi/components/console');

    const config = new AgentUiConfigService(configReader, options);
    const resolved = config.resolve();
    config.ensureWorkspaceConfig(resolved.root);
    const historyPath = path.join(resolved.root, HISTORY_FILE);

    let currentSessionId = resolved.sessionId;
    let currentProfile = resolved.model;
    let currentCtx: any = null;
    let runtime: any = null;
    let toolRegistry: any = null;
    let sessionStore: any = null;
    let approvalManager: any = null;
    let viewModel: any = null;
    let consoleState: any = null;
    let consoleRenderer: any = null;
    let consoleComponentRef: any = null;
    let panelRefs: Record<string, any> = {};
    let renderTimer: NodeJS.Timeout | null = null;
    let noticeTimer: NodeJS.Timeout | null = null;
    let inputLocked = false;
    let lastRenderKey = '';
    let lastRenderedLines: string[] = [];
    let lastPaintedLines: string[] = [];
    let lastPaintedWidth = 0;
    let screenNotice = '';
    let spinnerIndex = 0;
    let currentDraft = '';
    let draftCursor = 0;
    let isClosed = false;
    let exitFrameMode = false;
    let modalPromptActive = false;
    let selectMenu: SelectMenuState | null = null;
    let activeTextPrompt: { question: string; resolve: (value: string) => void; previousLocked: boolean; secret?: boolean } | null = null;
    let isSelecting = false;
    let stdinDataHandler: ((chunk: Buffer | string) => void) | null = null;
    let keypressHandler: ((str: string, key: readline.Key) => void) | null = null;
    let lastRawControlKey = '';
    let lastRawControlAt = 0;
    const terminalInputDecoder = new TerminalInputSequenceDecoder();
    let resizeHandler: (() => void) | null = null;
    let sigintHandler: (() => void) | null = null;
    let historyEntries: string[] = [];
    let historyIndex = -1;
    let historyDraft = '';
    let isCleaningUp = false;
    let approvalPromptActive = false;
    let renderQueued = false;
    let renderVersion = 0;
    let unsubscribeConsoleState: (() => void) | null = null;
    let terminalUiDelegate: TerminalConsoleUiDelegate | null = null;
    let mouseTrackingEnabled = false;
    let transcriptScrollOffset = 0;
    let transcriptMaxScrollOffset = 0;
    let transcriptVisibleRows = 0;
    let transcriptScrollbarColumn = 0;
    let transcriptScrollbarTopRow = 1;
    let transcriptScrollbarVisibleRows = 0;
    let transcriptScrollbarTotalRows = 0;
    let transcriptScrollbarDragging = false;
    let frozenTranscriptWindow: TerminalRenderedWindow | null = null;
    let frozenTranscriptWindowKey = '';
    let lastInlineCursorRow = 0;
    let currentCursorTarget: { row: number; column: number } | null = null;
    let terminalCursorVisible = true;
    const useAlternateScreen = shouldUseAlternateScreen();
    const syncTerminalCursorVisibility = (visible: boolean) => {
        if (!process.stdout.isTTY || terminalCursorVisible === visible) {
            return;
        }
        process.stdout.write(visible ? '\x1b[?25h' : '\x1b[?25l');
        terminalCursorVisible = visible;
    };
    const shouldRenderTerminalCursor = () => shouldPlaceConsoleCursor({
        isTTY: !!process.stdout.isTTY,
        isSelecting,
        hasBlockingSelectMenu: hasBlockingSelectMenu(),
        inputLocked,
        modalPromptActive,
        hasActiveTextPrompt: !!activeTextPrompt,
        hasSessionFocus: hasSessionFocus(),
        hasMessageFocus: hasMessageFocus(),
        hasMessageDetailFocus: hasMessageDetailFocus()
    });
    const renderTuiPanelLayout = (ref: any, width: number): { lines: string[]; cursorTargets?: Array<{ row: number; column: number }>; cursorTarget?: { row: number; column: number }; regions?: Array<{ id: string; startRow: number; endRow: number }> } | null => {
        const rootNodes = ref?.hostView?.rootNodes;
        const node = Array.isArray(rootNodes) ? rootNodes[0] : rootNodes;
        if (!node || !consoleRenderer?.renderToTuiLayout) {
            return null;
        }
        const layout = consoleRenderer.renderToTuiLayout(node, { width });
        const target = layout?.cursorTargets?.[0];
        return {
            lines: layout?.lines || [],
            cursorTargets: (layout?.cursorTargets || []).map((item: any) => ({
                row: item.row,
                column: item.column
            })),
            cursorTarget: target
                ? { row: target.row, column: target.column }
                : undefined,
            regions: layout?.regions || []
        };
    };
    const getComponentRenderState = (ref: any): TerminalPrimaryRenderState | undefined => {
        return ref?.__consolePrimaryRenderState;
    };
    const setComponentRenderState = (ref: any, state?: TerminalPrimaryRenderState): void => {
        if (!ref) {
            return;
        }
        ref.__consolePrimaryRenderState = state;
    };
    const applyScreenNotice = (message = '', transientMs?: number) => {
        screenNotice = message;
        if (noticeTimer) {
            clearTimeout(noticeTimer);
            noticeTimer = null;
        }
        if (message) {
            viewModel?.showNotice?.(message);
            if (transientMs && transientMs > 0) {
                const expected = message;
                noticeTimer = setTimeout(() => {
                    if (screenNotice !== expected) {
                        return;
                    }
                    screenNotice = '';
                    viewModel?.clearNotice?.();
                    renderScreen();
                }, transientMs);
            }
            return;
        }
        viewModel?.clearNotice?.();
    };
    const syncDraftFromConsoleState = () => {
        currentDraft = consoleState?.input || '';
        draftCursor = consoleState?.inputCursor ?? currentDraft.length;
    };
    const setDraftDisplay = () => {
        const displayDraft = activeTextPrompt?.secret
            ? '*'.repeat(currentDraft.length)
            : currentDraft;
        const inputFocused = !hasBlockingSelectMenu()
            && !hasSessionFocus()
            && !hasMessageFocus()
            && !hasMessageDetailFocus()
            && (!inputLocked || !!activeTextPrompt);
        consoleState?.setInput?.(displayDraft, Math.min(draftCursor, displayDraft.length));
        consoleState?.setInputFocused?.(inputFocused);
        if (activeTextPrompt?.secret) {
            if (isSuggestionMenu(consoleState?.selectMenu)) {
                consoleState.closeSelectMenu();
            }
            return;
        }
    };

    const isStreamingTurn = (): boolean => {
        return !!viewModel && (viewModel.status === 'running' || viewModel.status === 'reasoning');
    };

    const getActiveSelectMenu = (): { title: string; hint?: string; options: SelectMenuOption[]; selectedIndex: number } | undefined => {
        if (selectMenu) {
            return selectMenu;
        }
        return consoleState?.selectMenu || undefined;
    };

    const hasBlockingSelectMenu = (): boolean => {
        const activeMenu = getActiveSelectMenu();
        return !!activeMenu && !isSuggestionMenu(activeMenu);
    };

    const shouldRouteDraftNavigation = (): boolean => shouldRouteConsoleDraftNavigation({
        hasBlockingSelectMenu: hasBlockingSelectMenu(),
        hasSessionFocus: hasSessionFocus(),
        hasMessageFocus: hasMessageFocus(),
        hasMessageDetailFocus: hasMessageDetailFocus(),
        inputLocked,
        modalPromptActive,
        hasActiveTextPrompt: !!activeTextPrompt
    });

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
        try {
            fs.mkdirSync(path.dirname(historyPath), { recursive: true });
            fs.writeFileSync(historyPath, JSON.stringify(unique.slice(-200), null, 2) + '\n', 'utf8');
        } catch (error: any) {
            const code = String(error?.code || '');
            if (code !== 'EACCES' && code !== 'EPERM' && code !== 'EROFS') {
                throw error;
            }
        }
    };

    const clearPersistedHistory = () => {
        historyEntries = [];
        historyIndex = -1;
        historyDraft = '';
        try {
            if (fs.existsSync(historyPath)) {
                fs.unlinkSync(historyPath);
            }
        } catch (error: any) {
            const code = String(error?.code || '');
            if (code !== 'ENOENT' && code !== 'EACCES' && code !== 'EPERM' && code !== 'EROFS') {
                throw error;
            }
        }
    };

    historyEntries = loadHistory();

    const promptLine = (question: string, promptOptions: { secret?: boolean } = {}): Promise<string> => new Promise(resolve => {
        const previousLocked = inputLocked;
        inputLocked = true;
        modalPromptActive = true;
        isSelecting = false;
        selectMenu = null;
        consoleState?.closeSelectMenu?.();
        historyIndex = -1;
        historyDraft = '';
        activeTextPrompt = {
            question,
            secret: promptOptions.secret === true,
            previousLocked,
            resolve: (answer: string) => {
                inputLocked = previousLocked;
                modalPromptActive = false;
                activeTextPrompt = null;
                currentDraft = '';
                draftCursor = 0;
                updateDraftState('', 0);
                resolve(answer.trim());
            }
        };
        updateDraftState('', 0);
        renderScreen();
    });

    const setMouseTracking = (enabled: boolean) => {
        if (!process.stdin.isTTY || mouseTrackingEnabled === enabled) {
            return;
        }
        mouseTrackingEnabled = enabled;
        process.stdout.write(enabled
            ? '\x1b[?1000h\x1b[?1002h\x1b[?1006h'
            : '\x1b[?1000l\x1b[?1002l\x1b[?1006l');
    };

    const syncMouseTracking = () => {
        const enableMouseTracking = hasBlockingSelectMenu();
        setMouseTracking(enableMouseTracking);
    };

    const clearTerminalScreen = (clearScrollback = false) => {
        if (!process.stdout.isTTY) {
            return;
        }
        process.stdout.write(buildClearScreenSequence(clearScrollback));
        lastPaintedLines = [];
        lastPaintedWidth = 0;
        setComponentRenderState(consoleComponentRef, undefined);
    };

    const queueRenderScreen = () => {
        if (isClosed || renderQueued) {
            return;
        }
        const scheduledVersion = renderVersion;
        renderQueued = true;
        Promise.resolve().then(() => {
            renderQueued = false;
            if (isClosed || renderVersion !== scheduledVersion) {
                return;
            }
            renderScreen();
        });
    };

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
            consoleState?.closeSelectMenu?.();
            updateDraftState('', 0);
            resumeReadlineAfterSelection();
        };
    };

    const showSelectMenu = (title: string, options: SelectMenuOption[], initialIndex = 0, hint = DEFAULT_CONSOLE_SELECT_HINT): Promise<string | undefined> => {
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
            if (consoleState) {
                consoleState.selectMenuAction = resolveSelection;
            }
            renderSelectionNotice();
        });
    };

    const promptSelect = async (title: string, options: SelectMenuOption[], initialIndex = 0, hint = DEFAULT_CONSOLE_SELECT_HINT): Promise<string | undefined> => {
        const finishSelectInteraction = beginSelectInteraction();
        try {
            return await showSelectMenu(title, options, initialIndex, hint);
        } finally {
            finishSelectInteraction();
        }
    };

    const updateDraftState = (nextDraft: string, cursor = nextDraft.length) => {
        transcriptScrollOffset = 0;
        currentDraft = nextDraft;
        draftCursor = Math.max(0, Math.min(cursor, currentDraft.length));
        setDraftDisplay();
    };

    const applyChunkToDraft = (chunk: Buffer | string) => {
        const next = applyTerminalInputChunk(currentDraft, draftCursor, chunk);
        transcriptScrollOffset = 0;
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
        return isSuggestionMenu(consoleState?.selectMenu);
    };

    const scheduleDraftRefresh = () => {
        if (isClosed || isSelecting || inputLocked) {
            return;
        }
        Promise.resolve().then(() => {
            if (isClosed || isSelecting || inputLocked) {
                return;
            }
            queueRenderScreen();
        });
    };

    const isCancelInput = (value?: string): boolean => CANCEL_INPUTS.has(String(value || '').trim().toLowerCase());
    const isExitInput = (value?: string): boolean => EXIT_INPUTS.has(String(value || '').trim().toLowerCase());
    const assertNoExitInput = (value?: string) => {
        if (isExitInput(value)) {
            throw new ChatExitRequest();
        }
    };

    const getRetainedBrandLines = (): string[] => buildTerminalBrandBlock(
        resolveTerminalSize(process.stdout).columns,
        DEFAULT_TERMINAL_APP_TITLE,
        consoleState?.model || currentProfile?.model || '',
        consoleState?.workspace || resolved.workspace
    );

    const resolveNamedProfile = (
        profile: Partial<AgentCliProviderProfile> | undefined,
        names: string[]
    ): Partial<AgentCliProviderProfile> | undefined => {
        const profiles = profile?.profiles || {};
        for (const name of names) {
            const entry = (profiles as Record<string, AgentCliProviderProfile | undefined>)[name];
            if (entry) {
                return entry;
            }
        }
        return undefined;
    };

    const selectProvider = async (currentProvider?: string): Promise<string | undefined> => {
        const providerOptions = MODEL_PROVIDER_CHOICES.map(item => ({
            label: item.label,
            value: item.provider,
            detail: [
                `Provider: ${item.provider}`,
                `Flash: ${PROVIDER_DEFAULT_MODELS[item.provider] || 'custom-model'}`,
                `Strong: ${PROVIDER_STRONG_MODELS[item.provider] || PROVIDER_DEFAULT_MODELS[item.provider] || 'custom-model'}`,
                `Base URL: ${config.resolveProviderBaseUrl(item.provider) || '(custom)'}`
            ].join('\n')
        }));
        const currentProviderIndex = Math.max(0, MODEL_PROVIDER_CHOICES.findIndex(item => item.provider === currentProvider));
        return showSelectMenu('Model providers', providerOptions, currentProviderIndex);
    };

    const selectProviderModel = async (
        provider: string,
        currentModel: string,
        mode: 'flash' | 'strong'
    ): Promise<string | undefined> => {
        const providerSelection = MODEL_PROVIDER_CHOICES.find(item => item.provider === provider) || MODEL_PROVIDER_CHOICES[0];
        const models = PROVIDER_MODELS[provider] || [];
        if (models.length) {
            const modelOptions = models.map(item => ({
                label: item,
                value: item,
                detail: [
                    `Provider: ${providerSelection.label}`,
                    `Mode: ${mode}`,
                    `Model: ${item}`
                ].join('\n')
            }));
            const currentModelIndex = Math.max(0, models.indexOf(currentModel));
            return showSelectMenu(`${mode} model for ${providerSelection.label}`, modelOptions, currentModelIndex);
        }
        const modelAnswer = await promptLine(`${mode} model [${currentModel}]: `);
        assertNoExitInput(modelAnswer);
        if (isCancelInput(modelAnswer)) {
            return undefined;
        }
        return modelAnswer || currentModel;
    };

    const resolveProviderModeSelection = async (
        current?: Partial<AgentCliProviderProfile>
    ): Promise<{ provider: string; flashModel: string; strongModel: string; baseUrl?: string } | undefined> => {
        const finishSelectInteraction = beginSelectInteraction();
        let selectInteractionClosed = false;
        const closeSelectInteraction = () => {
            if (selectInteractionClosed) {
                return;
            }
            selectInteractionClosed = true;
            finishSelectInteraction();
        };

        const flashCurrent = resolveNamedProfile(current, ['flash', 'fast']) || current;
        const strongCurrent = resolveNamedProfile(current, ['strong']) || current;

        try {
            const provider = await selectProvider(current?.provider || flashCurrent?.provider);
            if (!provider) {
                return undefined;
            }

            const flashDefaultModel = flashCurrent?.provider === provider && flashCurrent?.model
                ? flashCurrent.model
                : (PROVIDER_DEFAULT_MODELS[provider] || 'custom-model');
            const strongDefaultModel = strongCurrent?.provider === provider && strongCurrent?.model
                ? strongCurrent.model
                : (PROVIDER_STRONG_MODELS[provider] || flashDefaultModel);

            const flashModel = await selectProviderModel(provider, flashDefaultModel, 'flash');
            if (!flashModel) {
                return undefined;
            }

            const strongModel = await selectProviderModel(provider, strongDefaultModel, 'strong');
            if (!strongModel) {
                return undefined;
            }

            closeSelectInteraction();

            const defaultBaseUrl = (flashCurrent?.provider === provider && flashCurrent?.baseUrl)
                || (strongCurrent?.provider === provider && strongCurrent?.baseUrl)
                || config.resolveProviderBaseUrl(provider)
                || '';
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
                flashModel,
                strongModel,
                baseUrl
            };
        } finally {
            closeSelectInteraction();
        }
    };

    const buildAdaptiveModelProfile = (
        selected: { provider: string; flashModel: string; strongModel: string; baseUrl?: string },
        apiKey: string,
        timeoutMs: number
    ): AgentCliProviderProfile => {
        return {
            provider: selected.provider,
            model: selected.flashModel,
            apiKey,
            baseUrl: selected.baseUrl,
            timeoutMs,
            defaultProfile: 'flash',
            profiles: {
                flash: {
                    provider: selected.provider,
                    model: selected.flashModel,
                    baseUrl: selected.baseUrl
                },
                strong: {
                    provider: selected.provider,
                    model: selected.strongModel,
                    baseUrl: selected.baseUrl,
                    reasoning: true
                }
            },
            complexityRouting: {
                simple: 'flash',
                moderate: 'flash',
                complex: 'strong'
            }
        };
    };

    const ensureInteractiveProfile = async (): Promise<AgentCliProviderProfile> => {
        const hasExplicitConfig = !!options.provider || !!options.model || !!options.apiKey || !!options.baseUrl;
        const resolvedProfile = config.resolve().model;
        const hasPersistedProvider = !!resolved.settingsModel?.provider && !!resolved.settingsModel?.model;
        const hasAdaptiveModelConfig = !!resolved.settingsModel?.defaultProfile || !!resolved.settingsModel?.profiles || !!resolved.settingsModel?.complexityRouting;
        const hasResolvedApiKey = !!resolvedProfile.apiKey;
        if (hasExplicitConfig || hasPersistedProvider || hasAdaptiveModelConfig || hasResolvedApiKey) {
            return resolvedProfile;
        }

        const selected = await resolveProviderModeSelection(resolved.settingsModel || resolved.providerProfile);
        if (!selected) {
            throw new Error('Model setup cancelled.');
        }
        const apiKey = await promptLine(`API key for ${selected.provider}: `, { secret: true });
        assertNoExitInput(apiKey);
        if (isCancelInput(apiKey)) {
            throw new Error('Model setup cancelled.');
        }
        const profile = buildAdaptiveModelProfile(selected, apiKey, 120000);
        const settingsPath = config.writeModelProfile(resolved.root, profile);
        if (!fs.existsSync(resolved.workspace)) {
            fs.mkdirSync(resolved.workspace, { recursive: true });
        }
        process.stdout.write(`Saved model config to ${settingsPath}\n`);
        return profile;
    };

    const refreshToolsForSession = async (targetSessionId: string) => {
        if (!consoleState) {
            return;
        }
        if (!toolRegistry) {
            consoleState.setTools([]);
            return;
        }
        const definitions = toolRegistry.getToolDefinitions(targetSessionId);
        const tools = await Promise.all(definitions.map(async (definition: any) => {
            const active = typeof toolRegistry.isToolActive === 'function'
                ? await toolRegistry.isToolActive(targetSessionId, definition.name)
                : definition.activation?.activated ?? true;
            return consoleState.toToolItem(definition, active);
        }));
        tools.sort((left: any, right: any) => left.name.localeCompare(right.name));
        consoleState.setTools(tools);
    };

    const refreshSessionsList = async (targetSessionId = currentSessionId) => {
        if (!consoleState) {
            return;
        }
        const ids = sessionStore && typeof sessionStore.listSessionIds === 'function'
            ? await sessionStore.listSessionIds()
            : [];
        const uniqueIds = Array.from(new Set([targetSessionId, ...ids]));
        const sessions = await Promise.all(uniqueIds.map(async (id: string) => {
            const state = sessionStore && typeof sessionStore.get === 'function'
                ? await sessionStore.get(id)
                : null;
            return {
                id,
                current: id === targetSessionId,
                updatedAt: state?.updatedAt,
                messageCount: state?.messages?.length ?? 0
            };
        }));
        sessions.sort((left, right) => {
            if (left.current && !right.current) {
                return -1;
            }
            if (!left.current && right.current) {
                return 1;
            }
            return (right.updatedAt || 0) - (left.updatedAt || 0);
        });
        consoleState.setSessions(sessions);
    };

    const resolveStartupSessionId = async (preferredId = currentSessionId): Promise<string> => {
        if (!sessionStore || typeof sessionStore.listSessionIds !== 'function' || typeof sessionStore.get !== 'function') {
            return preferredId;
        }
        const ids = await sessionStore.listSessionIds();
        const preferredExists = ids.includes(preferredId)
            || (typeof sessionStore.has === 'function' && await sessionStore.has(preferredId));
        const uniqueIds = Array.from(new Set<string>(preferredExists ? [preferredId, ...ids] : ids));
        const sessions = await Promise.all(uniqueIds.map(async (id: string) => {
            const state = await sessionStore.get(id);
            return {
                id,
                updatedAt: state?.updatedAt,
                messageCount: state?.messages?.length ?? 0
            };
        }));
        return pickRestoredSessionId(preferredId, sessions, !!options.session);
    };

    const hasSessionFocus = (): boolean => !!consoleState?.sessionsFocused;
    const hasMessageFocus = (): boolean => !!consoleState?.messagesFocused;
    const hasMessageDetailFocus = (): boolean => !!consoleState?.messageDetailOpen;

    const enterSessionFocus = async () => {
        await refreshSessionsList(currentSessionId);
        if (!consoleState?.sessions?.length) {
            applyScreenNotice('No sessions available.', 1200);
            renderScreen();
            return;
        }
        consoleState.closeMessageDetail?.();
        consoleState.setMessagesFocused(false);
        consoleState.setSessionsFocused(true);
        applyScreenNotice('');
        renderScreen();
    };

    const exitSessionFocus = () => {
        if (!consoleState) {
            return;
        }
        consoleState.setSessionsFocused(false);
        applyScreenNotice('');
        renderScreen();
    };

    const enterMessageFocus = async () => {
        if (!consoleState?.messages?.length) {
            applyScreenNotice('No messages available.', 1200);
            renderScreen();
            return;
        }
        consoleState.setSessionsFocused(false);
        consoleState.closeMessageDetail?.();
        consoleState.setMessagesFocused(true);
        applyScreenNotice('');
        renderScreen();
    };

    const exitMessageFocus = () => {
        if (!consoleState) {
            return;
        }
        consoleState.setMessagesFocused(false);
        applyScreenNotice('');
        renderScreen();
    };

    const dismissConsoleFocusLayer = () => {
        if (!consoleState?.dismissFocusLayer) {
            return;
        }
        void consoleState.dismissFocusLayer().then((dismissed: boolean) => {
            if (!dismissed) {
                return;
            }
            applyScreenNotice('');
            syncDraftFromConsoleState();
            renderScreen();
        });
    };

    const syncPendingApprovals = (targetSessionId = currentSessionId) => {
        if (!consoleState) {
            return [];
        }
        const pending = approvalManager && typeof approvalManager.getPending === 'function'
            ? approvalManager.getPending().filter((item: any) => item.sessionId === targetSessionId)
            : [];
        consoleState.setPendingApprovals(pending);
        return pending;
    };

    const refreshSessionState = async (targetSessionId = currentSessionId) => {
        if (!viewModel || !consoleState || !runtime) {
            return;
        }
        viewModel.configure({
            sessionId: targetSessionId,
            provider: currentProfile.provider,
            model: currentProfile.model,
            modelProfile: resolveModelProfileLabel(currentProfile),
            workspace: resolved.workspace
        });
        consoleState.setMessages(await runtime.getMessages(targetSessionId));
        consoleState.setStatus('idle');
        consoleState.setLastError('');
        await refreshSessionsList(targetSessionId);
        await refreshToolsForSession(targetSessionId);
        syncPendingApprovals(targetSessionId);
    };

    const listSessionIds = async (): Promise<string[]> => {
        const ids = sessionStore && typeof sessionStore.listSessionIds === 'function'
            ? await sessionStore.listSessionIds()
            : [];
        return Array.from(new Set([currentSessionId, ...ids])).sort();
    };

    const formatSessionListNotice = (sessionIds: string[]): string => {
        if (!sessionIds.length) {
            return `Sessions:\n  - ${currentSessionId} [current]`;
        }
        return [
            'Sessions:',
            ...sessionIds.map(id => `  - ${id}${id === currentSessionId ? ' [current]' : ''}`)
        ].join('\n');
    };

    const resolveModelProfileLabel = (profile: AgentCliProviderProfile): string => {
        const profiles = profile.profiles || {};
        const flashProfile = (profiles as Record<string, AgentCliProviderProfile | undefined>).flash
            || (profiles as Record<string, AgentCliProviderProfile | undefined>).fast;
        const strongProfile = (profiles as Record<string, AgentCliProviderProfile | undefined>).strong;
        if (strongProfile?.provider === profile.provider && strongProfile?.model === profile.model) {
            return 'strong';
        }
        if (flashProfile?.provider === profile.provider && flashProfile?.model === profile.model) {
            return 'flash';
        }
        if (profile.defaultProfile === 'strong') {
            return 'strong';
        }
        if (profile.defaultProfile === 'flash' || profile.defaultProfile === 'fast') {
            return 'flash';
        }
        if (profile.thinkingBudget && profile.thinkingBudget > 0) {
            return 'strong';
        }
        if (profile.reasoning) {
            return 'strong';
        }
        return profile.model ? 'flash' : '';
    };

    const switchSession = async (nextSessionId: string) => {
        const targetSessionId = buildChatSessionId(nextSessionId);
        currentSessionId = targetSessionId;
        transcriptScrollOffset = 0;
        await refreshSessionState(targetSessionId);
        consoleState?.setSessionsFocused(false);
        consoleState?.setMessagesFocused(false);
        consoleState?.closeMessageDetail?.();
        applyScreenNotice(`Switched to session ${targetSessionId}`, 1500);
    };

    const resolveCopyText = (target?: string): string => {
        const normalized = String(target || '').trim().toLowerCase();
        if (!normalized || normalized === 'last' || normalized === 'assistant') {
            const latestAssistant = [...(consoleState?.messages || [])]
                .reverse()
                .find((message: any) => message.role === 'assistant' && message.content);
            return latestAssistant?.content || '';
        }
        if (normalized === 'screen') {
            return lastRenderedLines.map(line => stripAnsi(line)).join('\n').trim();
        }
        if (normalized === 'input') {
            return currentDraft;
        }
        if (normalized === 'selected' || normalized === 'message') {
            return consoleState?.selectedMessage?.content || '';
        }
        return '';
    };

    const copyTextToClipboard = (text: string): boolean => {
        const value = String(text || '');
        if (!value) {
            return false;
        }
        const clipboardCommands: Array<{ command: string; args?: string[] }> = process.platform === 'darwin'
            ? [{ command: 'pbcopy' }]
            : process.platform === 'win32'
                ? [
                    { command: 'clip.exe' },
                    { command: 'powershell.exe', args: ['-NoProfile', '-Command', 'Set-Clipboard'] }
                ]
                : process.env.WAYLAND_DISPLAY
                    ? [{ command: 'wl-copy' }, { command: 'xclip', args: ['-selection', 'clipboard'] }, { command: 'xsel', args: ['--clipboard', '--input'] }]
                    : [{ command: 'xclip', args: ['-selection', 'clipboard'] }, { command: 'xsel', args: ['--clipboard', '--input'] }, { command: 'wl-copy' }];

        for (const item of clipboardCommands) {
            try {
                const result = spawnSync(item.command, item.args || [], {
                    input: value,
                    stdio: ['pipe', 'ignore', 'ignore'],
                    timeout: 1500
                });
                if (!result.error && result.status === 0) {
                    return true;
                }
            } catch {
                // Try the next clipboard backend.
            }
        }

        if (!process.stdout.isTTY) {
            return false;
        }
        process.stdout.write(buildOsc52ClipboardSequence(value));
        return true;
    };

    const copyFocusedText = (text: string, label: string): void => {
        const copied = copyTextToClipboard(text);
        applyScreenNotice(copied
            ? `Copied ${label} to clipboard.`
            : `Nothing to copy for ${label}.`, 1500);
        renderScreen();
    };

    terminalUiDelegate = new TerminalConsoleUiDelegate(
        promptSelect,
        promptLine,
        (message: string, duration?: number) => {
            applyScreenNotice(message, duration);
            renderScreen();
        },
        async (text: string) => copyTextToClipboard(text)
    );
    terminalUiDelegate.setQuitFn(() => {
        isClosed = true;
        void cleanupAndExit('', true, false, getRetainedBrandLines());
    });
    terminalUiDelegate.setCopyTargetFn(async (target?: string) => {
        return copyTextToClipboard(resolveCopyText(target));
    });
    terminalUiDelegate.setSessionAdapter(
        async () => {
            const ids = await listSessionIds();
            return ids.map(id => ({
                id,
                current: id === currentSessionId,
                detail: id === currentSessionId ? 'Current session' : 'Switch to this session'
            }));
        },
        async (sessionId?: string) => {
            if (viewModel?.status === 'running' || viewModel?.status === 'reasoning') {
                applyScreenNotice(sessionId
                    ? 'Wait for the current turn to finish before switching sessions.'
                    : 'Wait for the current turn to finish before starting a new session.', 1500);
                renderScreen();
                return;
            }
            await switchSession(sessionId || buildChatSessionId(''));
            renderScreen();
            safePrompt();
        }
    );
    terminalUiDelegate.setModelProfileAdapter({
        apply: async (profile) => {
            const nextProfile = buildAdaptiveModelProfile({
                provider: profile.provider,
                flashModel: profile.flashModel,
                strongModel: profile.strongModel,
                baseUrl: profile.baseUrl
            }, profile.apiKey, currentProfile.timeoutMs || 120000);
            config.writeModelProfile(resolved.root, nextProfile);
            await createChatContext(nextProfile);
            applyScreenNotice(`Switched to ${nextProfile.provider} / flash ${profile.flashModel} / strong ${profile.strongModel}`, 1800);
        }
    });

    const adjustTranscriptScroll = (delta: number) => {
        transcriptScrollOffset = Math.max(0, Math.min(transcriptMaxScrollOffset, transcriptScrollOffset + delta));
        renderScreen();
    };

    const jumpTranscriptScroll = (mode: 'start' | 'end') => {
        transcriptScrollOffset = mode === 'end' ? 0 : transcriptMaxScrollOffset;
        renderScreen();
    };

    const getTranscriptPageStep = (): number => {
        return Math.max(4, transcriptVisibleRows - 2);
    };

    const canScrollTranscript = (): boolean => transcriptMaxScrollOffset > 0;

    const isScrollbarMouseEvent = (mouse?: { x: number; y: number }): boolean => {
        return false;
    };

    const scrollTranscriptToMouseRow = (screenRow: number) => {
        if (!useAlternateScreen || !canScrollTranscript() || transcriptScrollbarVisibleRows <= 0) {
            return;
        }
        const maxStartRow = Math.max(0, transcriptScrollbarTotalRows - transcriptScrollbarVisibleRows);
        if (maxStartRow <= 0) {
            transcriptScrollOffset = 0;
            renderScreen();
            return;
        }
        const relativeRow = Math.max(0, Math.min(
            transcriptScrollbarVisibleRows - 1,
            screenRow - transcriptScrollbarTopRow
        ));
        const ratio = transcriptScrollbarVisibleRows <= 1
            ? 0
            : relativeRow / (transcriptScrollbarVisibleRows - 1);
        const targetStartRow = Math.round(ratio * maxStartRow);
        transcriptScrollOffset = Math.max(0, Math.min(
            transcriptMaxScrollOffset,
            maxStartRow - targetStartRow
        ));
        renderScreen();
    };

    const resolveApprovalRequest = async (requestId?: string): Promise<any | undefined> => {
        const pending = syncPendingApprovals();
        if (!pending.length) {
            return undefined;
        }
        if (!requestId) {
            if (pending.length === 1) {
                return pending[0];
            }
            const selected = await promptSelect('Pending approvals', pending.map((item: any) => ({
                label: `${item.toolName} (${item.id.slice(0, 8)})`,
                value: item.id,
                detail: [
                    `Reason: ${item.reason}`,
                    item.inputSummary ? `Input: ${item.inputSummary}` : 'Input: -',
                    `Timeout: ${item.timeoutMs}ms`
                ].join('\n')
            })), 0, 'enter inspect   q cancel');
            if (!selected) {
                return undefined;
            }
            return pending.find((item: any) => item.id === selected);
        }
        const exact = pending.find((item: any) => item.id === requestId);
        if (exact) {
            return exact;
        }
        const matches = pending.filter((item: any) => item.id.startsWith(requestId));
        if (matches.length === 1) {
            return matches[0];
        }
        if (matches.length > 1) {
            throw new Error(`Approval id "${requestId}" is ambiguous.`);
        }
        throw new Error(`Approval id "${requestId}" not found.`);
    };

    const handleApprovalDecision = async (decision: 'approve' | 'deny', requestId?: string) => {
        try {
            const request = await resolveApprovalRequest(requestId);
            if (!request) {
                applyScreenNotice('No pending approvals.', 1500);
                return;
            }
            const applied = decision === 'approve'
                ? approvalManager?.approve?.(request.id)
                : approvalManager?.reject?.(request.id);
            syncPendingApprovals();
            applyScreenNotice(applied
                ? `${decision === 'approve' ? 'Approved' : 'Denied'} ${request.toolName} (${request.id.slice(0, 8)})`
                : `Approval request ${request.id.slice(0, 8)} is no longer pending.`, 1500);
        } catch (error: any) {
            applyScreenNotice(`Error: ${error.message}`);
        }
    };

    const maybePromptPendingApproval = async () => {
        if (approvalPromptActive || !approvalManager || isClosed || modalPromptActive || inputLocked || isSelecting) {
            return;
        }
        const pending = syncPendingApprovals();
        const request = pending[0];
        if (!request) {
            return;
        }
        approvalPromptActive = true;
        try {
            const result = await promptSelect('Approval required', [
                {
                    label: 'Approve',
                    value: 'approve',
                    detail: [
                        `Tool: ${request.toolName}`,
                        `Reason: ${request.reason}`,
                        request.inputSummary ? `Input: ${request.inputSummary}` : 'Input: -'
                    ].join('\n')
                },
                {
                    label: 'Deny',
                    value: 'deny',
                    detail: [
                        `Tool: ${request.toolName}`,
                        `Reason: ${request.reason}`,
                        `Reject request ${request.id.slice(0, 8)}`
                    ].join('\n')
                }
            ], 0, 'enter approve   down choose deny   q deny');
            await handleApprovalDecision(result === 'approve' ? 'approve' : 'deny', request.id);
        } finally {
            approvalPromptActive = false;
        }
    };

    const createChatContext = async (profile: AgentCliProviderProfile, allowSessionRestore = true): Promise<void> => {
        if (viewModel) {
            unsubscribeConsoleState?.();
            unsubscribeConsoleState = null;
            viewModel.dispose?.();
            viewModel = null;
        }
        if (consoleComponentRef) {
            await consoleComponentRef.destroy?.();
            consoleComponentRef = null;
            panelRefs = {};
        }
        if (currentCtx) {
            await currentCtx.close();
            currentCtx = null;
        }
        const agentOptions = mergeAgentOptions({
            model: {
                provider: profile.provider,
                model: profile.model,
                baseUrl: profile.baseUrl,
                apiKey: profile.apiKey,
                apiKeyEnv: profile.apiKeyEnv,
                timeoutMs: profile.timeoutMs || 120000,
                thinkingBudget: profile.thinkingBudget,
                reasoning: profile.reasoning,
                defaultProfile: profile.defaultProfile,
                profiles: profile.profiles,
                routes: profile.routes,
                complexityRouting: profile.complexityRouting,
                complexityThresholds: profile.complexityThresholds
            },
            tools: {
                requireApproval: [
                    'terminal',
                    'write_file',
                    'edit_file',
                    'delete_file',
                    'move_file',
                    'copy_file',
                    'mkdir',
                    'process_start',
                    'process_kill',
                    'cron_manage',
                    'git_operations',
                    'backup'
                ]
            }
        });
        currentCtx = await runAgentApplication({
            ...options,
            root: resolved.root,
            workspace: resolved.workspace,
            session: currentSessionId,
            provider: profile.provider,
            model: profile.model,
            baseUrl: profile.baseUrl,
            apiKey: profile.apiKey,
            apiKeyEnv: profile.apiKeyEnv,
            timeout: String(profile.timeoutMs || 120000)
        }, agentOptions, terminalUiDelegate ? [{
            provide: require('@tsdi/agent').AgentConsoleUiDelegate,
            useValue: terminalUiDelegate
        }] : []);
        currentCtx.get(AgentUiModule);
        runtime = currentCtx.get(AgentRuntime);
        toolRegistry = currentCtx.get(ToolRegistry);
        sessionStore = currentCtx.get(SessionStore);
        approvalManager = currentCtx.get(ToolApprovalManager);
        if (allowSessionRestore) {
            const restoredSessionId = await resolveStartupSessionId(currentSessionId);
            if (restoredSessionId !== currentSessionId) {
                currentSessionId = restoredSessionId;
                await createChatContext(profile, false);
                return;
            }
        }
        consoleComponentRef = currentCtx.runners.getRef(AgentConsoleComponent);
        if (!consoleComponentRef) {
            throw new Error('Agent UI did not bootstrap AgentConsoleComponent.');
        }
        viewModel = consoleComponentRef.instance;
        await consoleComponentRef.render();
        consoleState = viewModel.sessionState || consoleComponentRef.injector.get(AgentConsoleSessionState);
        unsubscribeConsoleState = typeof consoleState?.subscribe === 'function'
            ? consoleState.subscribe(() => {
                queueRenderScreen();
            })
            : null;
        consoleState.setCommandHints(getChatCommands());
        consoleRenderer = currentCtx.get(TuiRenderer) || currentCtx.get(ConsoleRenderer);
        const runnerRef = consoleComponentRef;
        panelRefs = {
            status: runnerRef?.hostView?.query?.(AgentConsoleStatusPanelComponent) || null,
            sessions: runnerRef?.hostView?.query?.(AgentConsoleSessionsPanelComponent) || null,
            messages: runnerRef?.hostView?.query?.(AgentConsoleMessagesPanelComponent) || null,
            detail: runnerRef?.hostView?.query?.(AgentConsoleMessageDetailPanelComponent) || null,
            activity: runnerRef?.hostView?.query?.(AgentConsoleActivityPanelComponent) || null,
            tools: runnerRef?.hostView?.query?.(AgentConsoleToolsPanelComponent) || null,
            working: runnerRef?.hostView?.query?.(AgentConsoleWorkingPanelComponent) || null,
            toolRuns: runnerRef?.hostView?.query?.(AgentConsoleToolRunsPanelComponent) || null,
            input: runnerRef?.hostView?.query?.(AgentConsoleInputPanelComponent) || null,
            select: runnerRef?.hostView?.query?.(AgentConsoleSelectPanelComponent) || null
        };
        await refreshSessionState(currentSessionId);
        currentProfile = profile;
    };

    const cleanupAndExit = async (
        farewell = '',
        preserveScreen = false,
        clearScrollback = false,
        retainedLines: string[] = []
    ) => {
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
        if (noticeTimer) {
            clearTimeout(noticeTimer);
            noticeTimer = null;
        }
        if (process.stdin.isTTY) {
            setMouseTracking(false);
            syncTerminalCursorVisibility(true);
            process.stdout.write(buildTerminalCleanupSequence({
                reset: ANSI.reset,
                alternateScreen: useAlternateScreen,
                preserveScreen,
                clearScrollback,
                retainedLines,
                paintedLineCount: lastPaintedLines.length,
                terminalRows: process.stdout.rows || 0,
                currentRow: !useAlternateScreen && preserveScreen
                    ? lastInlineCursorRow
                    : undefined
            }));
            process.stdin.setRawMode?.(false);
        }
        lastPaintedLines = [];
        lastPaintedWidth = 0;
        persistHistory();
        unsubscribeConsoleState?.();
        unsubscribeConsoleState = null;
        viewModel?.dispose?.();
        viewModel = null;
        await consoleComponentRef?.destroy?.();
        consoleComponentRef = null;
        panelRefs = {};
        if (currentCtx) {
            await currentCtx.close();
            currentCtx = null;
        }
        if (farewell) {
            process.stdout.write(`${farewell}\n`);
        }
        process.exit(0);
    };

    function renderScreen() {
        if (isClosed) {
            return;
        }
        renderVersion += 1;
        const terminalSize = resolveTerminalSize(process.stdout);
        const terminalColumns = terminalSize.columns;
        const width = terminalSize.columns;
        const height = terminalSize.rows;
        const showingExitFrame = exitFrameMode;
        const brandModel = consoleState?.model || currentProfile?.model || '';
        const brandWorkspace = consoleState?.workspace || resolved.workspace;
        const brandLines = buildTerminalBrandBlock(width, DEFAULT_TERMINAL_APP_TITLE, brandModel, brandWorkspace);
        currentCursorTarget = null;
        let wantsDynamicTranscriptFlow = false;
        if (consoleState?.setStatus && viewModel) {
            consoleState.setStatus(viewModel.status);
        }
        const statusPanel = panelRefs.status?.instance;
        const sessionsPanel = panelRefs.sessions?.instance;
        const messagesPanel = panelRefs.messages?.instance;
        const detailPanel = panelRefs.detail?.instance;
        const workingPanel = panelRefs.working?.instance;
        const inputPanel = panelRefs.input?.instance;
        const selectPanel = panelRefs.select?.instance;
        const topFixedBlocks: string[][] = [];
        const bottomFixedBlocks: string[][] = [];
        const transcriptBlocks: string[][] = [];
        const selectLines: string[] = [];
        let inputLines: string[] = [];
        let selectedMessageBlockIndex = -1;
        let messagesFocused = false;
        let contextTranscriptBlocks: string[][] = transcriptBlocks;
        let flatScrollableTranscriptLines: string[] = [];
        let shouldFreezeTranscriptWindow = false;
        let frozenTranscriptSourceKey = '';
        let inputLayout: { lines: string[]; cursorTargets?: Array<{ row: number; column: number }>; cursorTarget?: { row: number; column: number }; regions?: Array<{ id: string; startRow: number; endRow: number }> } | null = null;
        let selectLayout: { lines: string[]; cursorTargets?: Array<{ row: number; column: number }>; cursorTarget?: { row: number; column: number }; regions?: Array<{ id: string; startRow: number; endRow: number }> } | null = null;
        const offsetCursorTarget = (target: { row: number; column: number } | null | undefined, rowOffset: number): { row: number; column: number } | null => {
            if (!target) {
                return null;
            }
            return {
                row: rowOffset + target.row,
                column: target.column
            };
        };
        const browsingTranscriptHistory = transcriptScrollOffset > 0;
        const toPaintedLine = (line?: string, ...codes: string[]): string | undefined => {
            if (!line) {
                return undefined;
            }
            return paint(line, ...codes);
        };
        const pushLine = (target: string[], line?: string, ...codes: string[]) => {
            const renderedLine = toPaintedLine(line, ...codes);
            if (renderedLine) {
                target.push(renderedLine);
            }
        };
        const pushBlank = (target: string[]) => {
            if (target.length && target[target.length - 1] !== '') {
                target.push('');
            }
        };
        const pushBlock = (target: string[][], lines: Array<string | undefined>) => {
            const normalized = compactRenderedLines(
                lines.filter((line): line is string => !!line),
                Number.MAX_SAFE_INTEGER
            );
            if (normalized.length) {
                target.push(normalized);
            }
        };
        if (!consoleState || !viewModel) {
            const preInputLines: string[] = [];
            if (screenNotice) {
                pushLine(preInputLines, screenNotice, ANSI.dim);
            }
            if (activeTextPrompt?.question) {
                pushBlank(preInputLines);
                pushLine(preInputLines, activeTextPrompt.question, ANSI.dim);
            }
            pushBlank(preInputLines);
            const inputPrompt = consoleState?.inputPrompt || DEFAULT_CONSOLE_OPTIONS.inputPrompt || '';
            const promptText = `${inputPrompt}${currentDraft}`;
            inputLines = [
                ...renderTerminalBlock(promptText, {
                    width,
                    shellCodes: [ANSI.bg],
                    lineCodes: [ANSI.text],
                    paint
                }),
                paint(formatTerminalStatusFooter(
                    currentProfile?.model || '',
                    resolveModelProfileLabel(currentProfile || {} as AgentCliProviderProfile),
                    resolved.workspace
                ), ANSI.dim)
            ];
            currentCursorTarget = {
                row: brandLines.length + preInputLines.length + 1,
                column: Math.min(width - 1, 1 + getDisplayWidth(inputPrompt) + getDisplayWidth(currentDraft.slice(0, draftCursor)))
            };
            const activeMenu = getActiveSelectMenu();
            if (activeMenu) {
                pushBlank(selectLines);
                pushLine(selectLines, activeMenu.title, ANSI.text);
                pushLine(selectLines, activeMenu.hint, ANSI.dim);
                const visibleWindow = resolveConsoleSelectWindow(
                    activeMenu.options.length,
                    activeMenu.selectedIndex,
                    DEFAULT_CONSOLE_OPTIONS.selectVisibleOptions || 0
                );
                activeMenu.options.slice(visibleWindow.start, visibleWindow.start + visibleWindow.count).forEach((option, index) => {
                    const absoluteIndex = visibleWindow.start + index;
                    const label = formatConsoleIndexedOptionLabel(
                        absoluteIndex,
                        option.label,
                        activeMenu.selectedIndex === absoluteIndex
                    );
                    if (activeMenu.selectedIndex === absoluteIndex) {
                        selectLines.push(paint(` ${label} `, ANSI.bgSelected, ANSI.blueStrong));
                        return;
                    }
                    pushLine(selectLines, label, ANSI.text);
                });
                const selected = activeMenu.options[activeMenu.selectedIndex];
                const detailLines = resolveConsoleSelectDetailLines(selected as any, {
                    text: DEFAULT_CONSOLE_OPTIONS.selectDetailVisibleLines || 0,
                    json: DEFAULT_CONSOLE_OPTIONS.selectDetailVisibleLines || 0
                });
                if (detailLines.length) {
                    pushLine(selectLines, 'Preview', ANSI.dim);
                    detailLines.forEach(line => pushLine(selectLines, line, ANSI.text));
                }
            }
            const rendered = [
                ...brandLines,
                ...(useAlternateScreen
                    ? compactRenderedLines(preInputLines, Math.max(0, height - inputLines.length - selectLines.length))
                    : preInputLines),
                ...inputLines,
                ...(useAlternateScreen
                    ? compactRenderedLines(selectLines, Math.max(0, height))
                    : selectLines)
            ];
            if (!useAlternateScreen) {
                lastRenderedLines = rendered.slice();
                const cursorMode = activeMenu ? 'bottom' : 'prompt';
                const cursorRow = cursorMode === 'prompt' && currentCursorTarget
                    ? currentCursorTarget.row
                    : Math.max(0, rendered.length - 1);
                syncMouseTracking();
                const result = renderPrimaryTerminalScreen({
                    state: getComponentRenderState(consoleComponentRef),
                    lines: rendered,
                    width,
                    stablePrefixRows: brandLines.length + preInputLines.length,
                    cursorRow,
                    cursorTarget: shouldRenderTerminalCursor() ? currentCursorTarget || undefined : undefined,
                    cursorMode,
                    placeCursor: true
                });
                setComponentRenderState(consoleComponentRef, result.state);
                if (result.output) {
                    process.stdout.write(result.output);
                }
                lastRenderKey = '';
                lastPaintedLines = result.fittedLines.slice();
                lastPaintedWidth = width;
                lastInlineCursorRow = result.terminalRow;
                syncTerminalCursorVisibility(shouldRenderTerminalCursor());
                return;
            }
            lastRenderedLines = rendered.slice();
            const fittedLines = rendered.map((line: string) => fitAnsiLine(line, width));
            const nextRenderKey = `${width}:${fittedLines.join('\n')}`;
            if (nextRenderKey === lastRenderKey) {
                placeTerminalCursor(rendered, width);
                return;
            }
            lastRenderKey = nextRenderKey;
            const updateCommands: string[] = [];
            const maxLines = Math.max(fittedLines.length, lastPaintedLines.length);
            for (let index = 0; index < maxLines; index++) {
                const nextLine = index < fittedLines.length ? fittedLines[index] : '';
                const previousLine = index < lastPaintedLines.length ? lastPaintedLines[index] : undefined;
                if (previousLine === nextLine && width === lastPaintedWidth) {
                    continue;
                }
                updateCommands.push(`\x1b[${index + 1};1H${nextLine}\x1b[K`);
            }
            if (updateCommands.length) {
                process.stdout.write(updateCommands.join(''));
            }
            lastPaintedLines = fittedLines.slice();
            lastPaintedWidth = width;
            placeTerminalCursor(rendered, width);
            return;
        } else {
        const sessionsFocused = !!consoleState?.sessionsFocused;
        messagesFocused = !!consoleState?.messagesFocused;
        const messageDetailFocused = !!consoleState?.messageDetailOpen;
        const visibleMessages = showingExitFrame
            ? []
            : (Array.isArray(consoleState?.messages) ? consoleState.messages : []);
        const shouldRenderTranscript = shouldRenderConsoleTranscript({
            showingExitFrame,
            hasSessionFocus: sessionsFocused,
            hasMessageFocus: messagesFocused,
            hasMessageDetailFocus: messageDetailFocused
        });
        const shouldSplitLiveAssistant = shouldRenderTranscript
            && !showingExitFrame
            && !sessionsFocused
            && !messagesFocused
            && !messageDetailFocused
            && !selectPanel?.menu
            && !activeTextPrompt
            && isStreamingTurn();
        const liveTurnBlocks: string[][] = [];
        const transcriptKinds: Array<'you' | 'agent' | 'other'> = [];
        wantsDynamicTranscriptFlow = shouldRenderTranscript
            && !showingExitFrame
            && visibleMessages.length > 0
            && !sessionsFocused
            && !messagesFocused
            && !messageDetailFocused
            && !workingPanel?.shouldShow
            && !selectPanel?.menu
            && !activeTextPrompt;
        const showStatusPanel = !showingExitFrame
            && !browsingTranscriptHistory
            && !sessionsFocused
            && !messagesFocused
            && !messageDetailFocused
            && visibleMessages.length === 0
            && !!statusPanel?.shouldShow;
        if (showStatusPanel) {
            pushBlock(topFixedBlocks, Array.from({ length: DEFAULT_CONSOLE_OPTIONS.statusVisibleLines || 0 }, (_, index) => toPaintedLine(
                statusPanel?.statusLineAt?.(index),
                ANSI.dim
            )));
        }
        if (!showingExitFrame && sessionsFocused && sessionsPanel?.shouldShow) {
            pushBlock(topFixedBlocks, [
                toPaintedLine(sessionsPanel.sessionsSummaryLabel, ANSI.amber),
                toPaintedLine(sessionsPanel.sessionsHintLabel, ANSI.dim),
                ...Array.from({ length: DEFAULT_CONSOLE_OPTIONS.sessionsVisibleItems || 0 }, (_, index) => {
                    const line = sessionsPanel.sessionLabelAt?.(index);
                    if (!line) {
                        return undefined;
                    }
                    if (line.trimStart().startsWith('›')) {
                        return paint(` ${line} `, ANSI.bgSelected, ANSI.amber);
                    }
                    return paint(line, line.includes(' [current]') ? ANSI.amber : ANSI.text);
                })
            ]);
        }
        if (!showingExitFrame && messagesFocused && messagesPanel) {
            pushBlock(topFixedBlocks, [
                toPaintedLine(messagesPanel.messagesHintLabel, ANSI.dim),
                ...Array.from({ length: DEFAULT_CONSOLE_OPTIONS.messagesVisibleItems || 0 }, (_, index) => {
                    const item = messagesPanel.messageAt?.(index);
                    if (!item) {
                        return undefined;
                    }
                    const line = `${item.role || ''}${item.content || ''}`;
                    if (item.selected) {
                        return paint(` ${line || ' '} `, ANSI.bgSelected, ANSI.blueStrong);
                    }
                    if (item.kind === 'you') {
                        return paint(line, ANSI.text);
                    }
                    if (item.kind === 'agent') {
                        return paint(line, ANSI.text);
                    }
                    return paint(line, ANSI.dim);
                })
            ]);
        }
        const resolveKind = (role?: string): 'you' | 'agent' | 'other' => {
            const normalized = String(role || '').toLowerCase();
            if (normalized === 'user') {
                return 'you';
            }
            if (normalized === 'assistant') {
                return 'agent';
            }
            return 'other';
        };
        const transcriptContentWidth = Math.max(12, width - 6);
        const liveAssistantMessageIndex = shouldSplitLiveAssistant
            && visibleMessages.length > 0
            && resolveKind(visibleMessages[visibleMessages.length - 1]?.role) === 'agent'
            && !!String(visibleMessages[visibleMessages.length - 1]?.content || '').trim()
            ? visibleMessages.length - 1
            : -1;
        const liveUserMessageIndex = liveAssistantMessageIndex > 0
            && resolveKind(visibleMessages[liveAssistantMessageIndex - 1]?.role) === 'you'
            ? liveAssistantMessageIndex - 1
            : -1;
        (shouldRenderTranscript ? visibleMessages : []).forEach((message: any, messageIndex: number) => {
            const kind = resolveKind(message?.role);
            const selected = !!message?.id && message.id === consoleState?.selectedMessageId && messagesFocused;
            const content = String(message?.content || '');
            const isLiveAssistant = messageIndex === liveAssistantMessageIndex;
            const isLiveUser = messageIndex === liveUserMessageIndex;
            if (kind === 'you') {
                const wrapped = wrapPrefixedText(content, Math.max(8, transcriptContentWidth), '› ', '  ');
                const userBlock = renderTerminalBlockLines(wrapped, {
                    width,
                    shellCodes: [ANSI.bg],
                    lineCodes: [ANSI.bg, selected ? ANSI.blueStrong : ANSI.text],
                    paint
                });
                if (isLiveUser) {
                    liveTurnBlocks.push(userBlock);
                } else {
                    transcriptBlocks.push(userBlock);
                    transcriptKinds.push(kind);
                }
                if (selected) {
                    selectedMessageBlockIndex = messageIndex;
                }
                return;
            }
            const renderedLines = renderTerminalMarkdownLines(content, transcriptContentWidth);
            const assistantBlock = renderTerminalBlockLines(renderedLines.map(renderedLine => {
                if (!renderedLine) {
                    return '';
                }
                if (selected) {
                    return paint(stripAnsi(renderedLine), ANSI.blueStrong);
                }
                if (/\x1b\[[0-9;]*m/.test(renderedLine)) {
                    return renderedLine;
                }
                return paint(renderedLine, ANSI.text);
            }), {
                width,
                shellCodes: selected ? [ANSI.bgSelected] : [ANSI.text],
                paint
            });
            if (isLiveAssistant) {
                liveTurnBlocks.push(assistantBlock);
            } else {
                transcriptBlocks.push(assistantBlock);
                transcriptKinds.push(kind);
            }
            if (selected) {
                selectedMessageBlockIndex = messageIndex;
            }
        });
        if (!messagesFocused && transcriptKinds.length >= 2) {
            const latestKind = transcriptKinds[transcriptKinds.length - 1];
            const previousKind = transcriptKinds[transcriptKinds.length - 2];
            if (latestKind === 'agent' && previousKind === 'you') {
                const previousBlock = transcriptBlocks[transcriptBlocks.length - 2] || [];
                const latestBlock = transcriptBlocks[transcriptBlocks.length - 1] || [];
                contextTranscriptBlocks = [
                    ...transcriptBlocks.slice(0, -2),
                    [...previousBlock, ...latestBlock]
                ];
            }
        }
        if (!showingExitFrame && messageDetailFocused && detailPanel?.shouldShow) {
            pushBlock(topFixedBlocks, [
                toPaintedLine(detailPanel.detailSummaryLabel, ANSI.blue),
                toPaintedLine(detailPanel.detailHintLabel, ANSI.dim),
                ...Array.from({ length: DEFAULT_CONSOLE_OPTIONS.messageDetailVisibleLines || 0 }, (_, index) => {
                    const number = detailPanel.detailLineNumberAt?.(index);
                    const content = detailPanel.detailLineContentAt?.(index);
                    return number || content
                        ? paint(`${number || ''}${content || ''}`, ANSI.text)
                        : undefined;
                })
            ]);
        }
        const scrollTranscriptBlocks = liveTurnBlocks.length
            ? [...transcriptBlocks, ...liveTurnBlocks]
            : transcriptBlocks;
        flatScrollableTranscriptLines = scrollTranscriptBlocks.flatMap(block => block);
        if (!showingExitFrame && !browsingTranscriptHistory && liveTurnBlocks.length) {
            const livePanelRows = Math.max(8, Math.min(12, Math.floor(height / 3)));
            const liveWindow = windowRenderedBlocksFromBottomWithContext(
                liveTurnBlocks,
                livePanelRows,
                Math.min(4, Math.max(2, Math.floor(livePanelRows / 3)))
            );
            const liveLines = liveWindow.startRow > 0
                ? liveWindow.lines
                : liveWindow.lines;
            const paddedLiveLines = liveLines.length < livePanelRows
                ? [
                    ...liveLines,
                    ...Array.from({ length: livePanelRows - liveLines.length }, () => paint(' ', ANSI.dim))
                ]
                : liveLines;
            pushBlock(bottomFixedBlocks, paddedLiveLines);
            shouldFreezeTranscriptWindow = !messagesFocused
                && (viewModel.status === 'running' || viewModel.status === 'reasoning');
            frozenTranscriptSourceKey = `${width}:${transcriptBlocks.flatMap(block => block).join('\n')}`;
        }
        if (!showingExitFrame && !browsingTranscriptHistory && workingPanel?.shouldShow) {
            const animatedLabel = workingPanel.animatedLabel || '';
            const activeIndex = Number.isFinite(workingPanel.activeAnimatedCharIndex)
                ? workingPanel.activeAnimatedCharIndex
                : -1;
            const glowRadius = Number.isFinite(workingPanel.animatedGlowRadius)
                ? workingPanel.animatedGlowRadius
                : 0;
            const paintedAnimatedLabel = animatedLabel
                .split('')
                .map((char: string, index: number) => {
                    const distance = Math.abs(index - activeIndex);
                    if (distance === 0) {
                        return paint(char, ANSI.blueStrong);
                    }
                    if (distance <= glowRadius) {
                        return paint(char, ANSI.blue);
                    }
                    return paint(char, ANSI.dim);
                })
                .join('');
            const suffix = workingPanel.workingSuffixLabel || '';
            const detail = workingPanel.workingDetail || '';
            pushBlock(bottomFixedBlocks, [`${paintedAnimatedLabel}${paint(suffix, ANSI.dim)}${paint(detail, ANSI.text)}`]);
        }
        if (!showingExitFrame && activeTextPrompt?.question) {
            pushBlock(bottomFixedBlocks, [toPaintedLine(activeTextPrompt.question, ANSI.dim)]);
        }
        if (!showingExitFrame) {
            const promptValue = consoleState?.input || '';
            const placeholder = consoleState?.inputPlaceholderLabel || '';
            const promptText = `${consoleState?.inputPrompt || DEFAULT_CONSOLE_OPTIONS.inputPrompt || ''}${resolveConsolePlaceholderDisplayValue(promptValue, placeholder, true)}`;
            inputLayout = renderTuiPanelLayout(panelRefs.input, width);
            const hintText = consoleState?.inputHintLabel || formatTerminalStatusFooter(
                consoleState?.model || currentProfile?.model || '',
                String(consoleState?.modelProfile || resolveModelProfileLabel(currentProfile || {} as AgentCliProviderProfile) || '').trim(),
                consoleState?.workspace || resolved.workspace
            );
            inputLines = inputLayout?.lines?.length
                ? inputLayout.lines.slice()
                : [
                    ...renderTerminalBlock(promptText, {
                        width,
                        shellCodes: [ANSI.bg],
                        lineCodes: [promptValue ? ANSI.text : ANSI.muted],
                        paint
                    }),
                    paint(hintText, ANSI.muted)
                ];
            if (inputLayout?.lines?.length && hintText) {
                inputLines[inputLines.length - 1] = paint(hintText, ANSI.muted);
            }
            if (bottomFixedBlocks.length && inputLines.length) {
                inputLines.unshift('');
            }
            currentCursorTarget = inputLayout?.cursorTarget || null;
        }
        if (!showingExitFrame && selectPanel?.menu) {
            selectLayout = renderTuiPanelLayout(panelRefs.select, width);
            if (selectLayout?.lines?.length) {
                pushBlank(selectLines);
                selectLines.push(...selectLayout.lines);
            } else {
                pushBlank(selectLines);
                pushLine(selectLines, selectPanel.menuTitle, ANSI.text);
                pushLine(selectLines, selectPanel.menuMeta, ANSI.dim);
                for (let index = 0; index < (DEFAULT_CONSOLE_OPTIONS.selectVisibleOptions || 0); index++) {
                    const line = selectPanel.optionLabelAt?.(index);
                    if (!line) {
                        continue;
                    }
                    if (line.trimStart().startsWith('›')) {
                        selectLines.push(paint(` ${line} `, ANSI.bgSelected, ANSI.blueStrong));
                        continue;
                    }
                    pushLine(selectLines, line, ANSI.text);
                }
                pushLine(selectLines, selectPanel.detailTitle, ANSI.dim);
                for (let index = 0; index < (DEFAULT_CONSOLE_OPTIONS.selectDetailVisibleLines || 0); index++) {
                    const line = selectPanel.detailLineAt?.(index);
                    if (line) {
                        pushLine(selectLines, line, ANSI.text);
                    }
                }
                pushLine(selectLines, selectPanel.menuHint, ANSI.dim);
            }
        }
        }
        if (!useAlternateScreen) {
            if (!shouldFreezeTranscriptWindow) {
                frozenTranscriptWindow = null;
                frozenTranscriptWindowKey = '';
            }
            const topFixedLines = topFixedBlocks.flatMap(block => block);
            const rawBottomFixedLines = bottomFixedBlocks.flatMap(block => block);
            const footerSections = composeTerminalScreenSections(
                rawBottomFixedLines,
                inputLayout,
                selectLayout
            );
            const primaryLayout = composePrimaryTerminalScreen({
                state: getComponentRenderState(consoleComponentRef),
                topLines: [
                    ...brandLines,
                    ...topFixedLines
                ],
                transcriptBlocks,
                footerSections,
                scrollOffset: transcriptScrollOffset,
                anchorBlockIndex: messagesFocused && selectedMessageBlockIndex >= 0
                    ? selectedMessageBlockIndex
                    : -1,
                minContextRows: Math.min(DEFAULT_CONSOLE_OPTIONS.messageDetailVisibleLines || 0, Math.max(2, Math.floor(height / 6)))
            });
            transcriptVisibleRows = primaryLayout.transcriptVisibleRows;
            transcriptMaxScrollOffset = primaryLayout.transcriptMaxScrollOffset;
            transcriptScrollbarColumn = terminalColumns;
            transcriptScrollbarTopRow = primaryLayout.transcriptStartRow + 1;
            transcriptScrollbarVisibleRows = 0;
            transcriptScrollbarTotalRows = primaryLayout.transcriptTotalRows;
            if (transcriptScrollOffset > transcriptMaxScrollOffset) {
                transcriptScrollOffset = transcriptMaxScrollOffset;
            }
            const rendered = primaryLayout.lines;
            currentCursorTarget = primaryLayout.cursorTargets[0] || null;
            lastRenderedLines = rendered.slice();
            const cursorMode = selectLines.length || hasSessionFocus() || hasMessageFocus() || hasMessageDetailFocus() || inputLocked || modalPromptActive
                ? 'bottom'
                : 'prompt';
            const cursorRow = cursorMode === 'prompt' && currentCursorTarget
                ? currentCursorTarget.row
                : Math.max(0, rendered.length - 1);
            syncMouseTracking();
            const result = renderPrimaryTerminalScreen({
                state: getComponentRenderState(consoleComponentRef),
                lines: rendered,
                regions: primaryLayout.regions,
                width,
                stablePrefixRows: brandLines.length + topFixedLines.length + primaryLayout.visibleTranscriptLines.length,
                cursorRow,
                cursorTarget: shouldRenderTerminalCursor() ? currentCursorTarget || undefined : undefined,
                cursorMode,
                placeCursor: true
            });
            setComponentRenderState(consoleComponentRef, result.state);
            if (result.output) {
                process.stdout.write(result.output);
            }
            lastRenderKey = '';
            lastPaintedLines = result.fittedLines.slice();
            lastPaintedWidth = width;
            lastInlineCursorRow = result.terminalRow;
            syncTerminalCursorVisibility(shouldRenderTerminalCursor());
            return;
        }
        const topReservedRows = brandLines.length + inputLines.length + selectLines.length;
        const topFixedAnchorIndex = topFixedBlocks.length - 1;
        const compactTopFixedLines = compactRenderedBlocksWindow(
            topFixedBlocks,
            Math.max(0, height - topReservedRows),
            topFixedAnchorIndex
        );
        const flatTranscriptLines = transcriptBlocks.flatMap(block => block);
        const minimumTranscriptRows = flatTranscriptLines.length > 0 && bottomFixedBlocks.length > 0
            ? Math.min(8, Math.max(4, Math.floor(height / 4)))
            : 0;
        const provisionalBottomFixedLines = compactRenderedLines(
            bottomFixedBlocks.flatMap(block => block),
            Math.max(0, height - topReservedRows - compactTopFixedLines.lines.length - minimumTranscriptRows)
        );
        const reservedRows = brandLines.length + compactTopFixedLines.lines.length + provisionalBottomFixedLines.length + inputLines.length + selectLines.length;
        const availableTranscriptRows = Math.max(0, height - reservedRows);
        const useDynamicTranscriptFlow = useAlternateScreen
            && wantsDynamicTranscriptFlow
            && flatTranscriptLines.length > availableTranscriptRows;
        if (useDynamicTranscriptFlow) {
            const rendered = [
                ...brandLines,
                ...topFixedBlocks.flatMap(block => block),
                ...transcriptBlocks.flatMap(block => block),
                ...bottomFixedBlocks.flatMap(block => block),
                ...inputLines,
                ...selectLines
            ];
            const inputRowOffset = brandLines.length
                + topFixedBlocks.flatMap(block => block).length
                + transcriptBlocks.flatMap(block => block).length
                + bottomFixedBlocks.flatMap(block => block).length;
            currentCursorTarget = offsetCursorTarget(inputLayout?.cursorTarget || currentCursorTarget, inputRowOffset);
            lastRenderedLines = rendered.slice();
            const fittedLines = rendered.map((line: string) => fitAnsiLine(line, width));
            const nextRenderKey = `flow:${width}:${fittedLines.join('\n')}`;
            syncMouseTracking();
            if (nextRenderKey === lastRenderKey) {
                placeTerminalCursor(fittedLines, width, true);
                return;
            }
            const currentPromptRow = currentCursorTarget?.row ?? -1;
            const canPatchPromptOnly = lastRenderKey.startsWith('flow:')
                && currentPromptRow >= 0
                && fittedLines.length === lastPaintedLines.length
                && fittedLines.every((line, index) => index === currentPromptRow || line === lastPaintedLines[index]);
            if (canPatchPromptOnly) {
                const cursorTarget = currentCursorTarget!;
                process.stdout.write(`\r${fittedLines[currentPromptRow]}\x1b[K\r`);
                if (cursorTarget.column > 0) {
                    process.stdout.write(`\x1b[${Math.min(width - 1, cursorTarget.column)}C`);
                }
                lastRenderKey = nextRenderKey;
                lastRenderedLines = rendered.slice();
                lastPaintedLines = fittedLines.slice();
                lastPaintedWidth = width;
                return;
            }
            lastRenderKey = nextRenderKey;
            if (process.stdout.isTTY) {
                process.stdout.write(buildClearScreenSequence(false));
            }
            if (fittedLines.length) {
                process.stdout.write(fittedLines.join('\n'));
            }
            lastPaintedLines = fittedLines.slice();
            lastPaintedWidth = width;
            placeTerminalCursor(fittedLines, width, true);
            return;
        }
        const selectedAnchorIndex = consoleState?.messagesFocused && selectedMessageBlockIndex >= 0
            ? selectedMessageBlockIndex
            : transcriptBlocks.length - 1;
        const baseTranscriptWindow = transcriptScrollOffset > 0
            ? windowRenderedLinesFromBottom(
                flatScrollableTranscriptLines,
                availableTranscriptRows,
                transcriptScrollOffset
            )
            : messagesFocused
                ? compactRenderedBlocksWindow(
                    transcriptBlocks,
                    availableTranscriptRows,
                    selectedAnchorIndex
                )
                : windowRenderedBlocksFromBottomWithContext(
                    contextTranscriptBlocks,
                    availableTranscriptRows,
                    Math.min(DEFAULT_CONSOLE_OPTIONS.messageDetailVisibleLines || 0, Math.max(2, Math.floor(availableTranscriptRows / 3)))
                );
        if (!shouldFreezeTranscriptWindow) {
            frozenTranscriptWindow = null;
            frozenTranscriptWindowKey = '';
        }
        const transcriptWindow = shouldFreezeTranscriptWindow
            ? (() => {
                if (!frozenTranscriptWindow || frozenTranscriptWindowKey !== frozenTranscriptSourceKey) {
                    frozenTranscriptWindow = baseTranscriptWindow;
                    frozenTranscriptWindowKey = frozenTranscriptSourceKey;
                }
                return frozenTranscriptWindow;
            })()
            : baseTranscriptWindow;
        const maxTranscriptScrollOffset = Math.max(0, transcriptWindow.totalRows - transcriptWindow.lines.length);
        transcriptVisibleRows = transcriptWindow.lines.length;
        transcriptMaxScrollOffset = maxTranscriptScrollOffset;
        transcriptScrollbarColumn = terminalColumns;
        transcriptScrollbarTopRow = brandLines.length + compactTopFixedLines.lines.length + 1;
        transcriptScrollbarVisibleRows = transcriptWindow.lines.length;
        transcriptScrollbarTotalRows = transcriptWindow.totalRows;
        if (transcriptScrollOffset > maxTranscriptScrollOffset) {
            transcriptScrollOffset = maxTranscriptScrollOffset;
        }
        const transcriptBottomBlocks = bottomFixedBlocks.flatMap(block => block);
        const compactBottomFixedLines = compactRenderedLines(
            transcriptBottomBlocks,
            Math.max(0, height - brandLines.length - compactTopFixedLines.lines.length - transcriptWindow.lines.length - inputLines.length - selectLines.length)
        );
        const preInputLines = [
            ...brandLines,
            ...compactTopFixedLines.lines,
            ...transcriptWindow.lines,
            ...compactBottomFixedLines
        ];
        const scrollbarOverlay = '';
        const rendered = [
            ...preInputLines,
            ...inputLines,
            ...compactRenderedLines(selectLines, Math.max(0, height))
        ];
        currentCursorTarget = offsetCursorTarget(inputLayout?.cursorTarget || currentCursorTarget, preInputLines.length);
        lastRenderedLines = rendered.slice();
        const fittedLines = rendered.map((line: string) => fitAnsiLine(line, width));
        const nextRenderKey = `${width}:${fittedLines.join('\n')}${scrollbarOverlay}`;
        syncMouseTracking();

        if (nextRenderKey === lastRenderKey) {
            placeTerminalCursor(rendered, width);
            return;
        }
        lastRenderKey = nextRenderKey;
        const updateCommands: string[] = [];
        const maxLines = Math.max(fittedLines.length, lastPaintedLines.length);
        for (let index = 0; index < maxLines; index++) {
            const nextLine = index < fittedLines.length ? fittedLines[index] : '';
            const previousLine = index < lastPaintedLines.length ? lastPaintedLines[index] : undefined;
            if (previousLine === nextLine && width === lastPaintedWidth) {
                continue;
            }
            updateCommands.push(`\x1b[${index + 1};1H${nextLine}\x1b[K`);
        }
        if (updateCommands.length) {
            process.stdout.write(updateCommands.join('') + scrollbarOverlay);
        }
        lastPaintedLines = fittedLines.slice();
        lastPaintedWidth = width;
        placeTerminalCursor(rendered, width);
    }

    function placeTerminalCursor(rendered: string[], width: number, flowMode = false) {
        if (!shouldPlaceConsoleCursor({
            isTTY: !!process.stdout.isTTY,
            isSelecting,
            hasBlockingSelectMenu: hasBlockingSelectMenu(),
            inputLocked,
            modalPromptActive,
            hasActiveTextPrompt: !!activeTextPrompt,
            hasSessionFocus: hasSessionFocus(),
            hasMessageFocus: hasMessageFocus(),
            hasMessageDetailFocus: hasMessageDetailFocus()
        })) {
                syncTerminalCursorVisibility(false);
                return;
        }
        syncTerminalCursorVisibility(true);
        if (currentCursorTarget) {
            process.stdout.write(buildTerminalCursorSequence({
                target: currentCursorTarget,
                width,
                renderedLineCount: rendered.length,
                mode: flowMode ? 'flow' : 'absolute'
            }));
            return;
        }
        syncTerminalCursorVisibility(false);
    }

    function placeTerminalCursorColumn(rendered: string[], width: number, currentRow: number) {
        if (!shouldPlaceConsoleCursor({
            isTTY: !!process.stdout.isTTY,
            isSelecting,
            hasBlockingSelectMenu: hasBlockingSelectMenu(),
            inputLocked,
            modalPromptActive,
            hasActiveTextPrompt: !!activeTextPrompt,
            hasSessionFocus: hasSessionFocus(),
            hasMessageFocus: hasMessageFocus(),
            hasMessageDetailFocus: hasMessageDetailFocus()
        })) {
            syncTerminalCursorVisibility(false);
            return;
        }
        syncTerminalCursorVisibility(true);
        if (currentCursorTarget) {
            process.stdout.write(buildTerminalCursorSequence({
                target: currentCursorTarget,
                width,
                currentRow,
                mode: 'relative'
            }));
            return;
        }
        syncTerminalCursorVisibility(false);
    }

    const pushHistoryEntry = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
            return;
        }
        historyEntries = [trimmed, ...historyEntries.filter(item => item !== trimmed)].slice(0, 200);
        historyIndex = -1;
        historyDraft = '';
    };

    const findHistoryIndex = (startIndex: number, step: number) => {
        for (let index = startIndex; index >= 0 && index < historyEntries.length; index += step) {
            if (!shouldSkipConsoleHistoryEntry(historyEntries[index])) {
                return index;
            }
        }
        return -1;
    };

    const navigateHistory = (delta: number) => {
        if (!historyEntries.length) {
            return;
        }
        if (delta < 0) {
            if (historyIndex === -1) {
                historyDraft = currentDraft;
            }
            const nextIndex = findHistoryIndex(historyIndex + 1, 1);
            if (nextIndex < 0) {
                return;
            }
            historyIndex = nextIndex;
        } else {
            if (historyIndex === -1) {
                return;
            }
            const nextIndex = findHistoryIndex(historyIndex - 1, -1);
            if (nextIndex < 0) {
                historyIndex = -1;
                updateDraftState(historyDraft, historyDraft.length);
                renderScreen();
                return;
            }
            historyIndex = nextIndex;
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

    const cancelTextPrompt = () => {
        if (!activeTextPrompt) {
            return;
        }
        resolveTextPrompt('cancel');
    };

    const routeConsoleInputChunk = async (
        chunk: Buffer | string,
        options: { submitOnEnter?: boolean; ctrlKey?: boolean; altKey?: boolean } = {}
    ) => {
        if (!consoleState?.processRawChunk) {
            if (options.submitOnEnter === false) {
                applyChunkToDraft(chunk);
                renderScreen();
            }
            return;
        }
        const submittedDraft = currentDraft;
        try {
            applyScreenNotice('');
            historyIndex = -1;
            historyDraft = '';
            if (options.submitOnEnter) {
                transcriptScrollOffset = 0;
            }
            const result = await consoleState.processRawChunk(
                Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || ''),
                {
                    ...options,
                    hasSelectMenu: isSuggestionMenu(consoleState?.selectMenu)
                }
            );
            if (result.submitted) {
                const trimmed = submittedDraft.trim();
                if (trimmed) {
                    pushHistoryEntry(trimmed);
                    persistHistory();
                }
                await refreshSessionsList(currentSessionId);
            }
            syncDraftFromConsoleState();
            renderScreen();
        } catch {
            applyScreenNotice('');
            renderScreen();
        }
        safePrompt();
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
        const nextIndex = resolveTerminalMenuNextIndex(activeMenu.selectedIndex, activeMenu.options.length, delta);
        setActiveMenuIndex(nextIndex);
    };

    const confirmActiveMenuSelection = () => {
        const activeMenu = getActiveSelectMenu();
        if (!activeMenu) {
            return;
        }
        if (consoleState?.selectMenu) {
            void consoleState.confirmSelectMenu().then(() => {
                syncDraftFromConsoleState();
                renderScreen();
            });
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
            void consoleState.chooseSelectMenuIndex(index).then(() => {
                syncDraftFromConsoleState();
                renderScreen();
            });
            return;
        }
        if (selectMenu) {
            selectMenu.selectedIndex = index;
            selectMenu.resolve(selectMenu.options[index]?.value);
        }
    };

    const terminalMenuController = {
        getMenu: getActiveSelectMenu,
        move: moveActiveMenu,
        confirm: confirmActiveMenuSelection,
        confirmIndex: confirmActiveMenuIndex,
        cancel: cancelActiveMenuSelection
    };

    stdinDataHandler = (chunk: Buffer | string) => {
        if (isClosed) {
            return;
        }
        const decodedInput = terminalInputDecoder.decode(chunk);
        if (decodedInput.partial) {
            return;
        }
        const rawText = decodedInput.text;
        const controlKey = decodedInput.controlKey || parseTerminalInputControlKey(rawText);
        const rawMenuKey = resolveTerminalMenuInputKey(controlKey || '', rawText, {
            blockingMenu: hasBlockingSelectMenu()
        });
        if (handleTerminalMenuKey(terminalMenuController, rawMenuKey, '', { render: queueRenderScreen })) {
            const suppressionKey = resolveConsoleRawKeypressSuppressionKey({
                rawText,
                controlKey,
                menuKey: rawMenuKey
            });
            if (suppressionKey) {
                lastRawControlKey = suppressionKey;
                lastRawControlAt = Date.now();
            }
            return;
        }
        if (hasBlockingSelectMenu()) {
            const mouse = parseTerminalMouseEvent(chunk);
            if (mouse && !mouse.release) {
                const activeMenu = getActiveSelectMenu();
                if (!activeMenu) { return; }
                const index = findSelectMenuOptionIndexFromRenderedLines(lastRenderedLines, activeMenu.title, activeMenu.options.length, mouse.y);
                if (index >= 0 && index < activeMenu.options.length) {
                    consoleState?.chooseSelectMenuIndex?.(index);
                }
                return;
            }
            return;
        }
        if (hasMessageDetailFocus()) {
            if (controlKey === 'down') {
                lastRawControlKey = 'down';
                lastRawControlAt = Date.now();
                consoleState.scrollMessageDetail(1);
                renderScreen();
                return;
            }
            if (controlKey === 'up') {
                lastRawControlKey = 'up';
                lastRawControlAt = Date.now();
                consoleState.scrollMessageDetail(-1);
                renderScreen();
                return;
            }
            if (controlKey === 'left') {
                lastRawControlKey = 'left';
                lastRawControlAt = Date.now();
                consoleState.scrollMessageDetailColumns(-4);
                renderScreen();
                return;
            }
            if (controlKey === 'right') {
                lastRawControlKey = 'right';
                lastRawControlAt = Date.now();
                consoleState.scrollMessageDetailColumns(4);
                renderScreen();
                return;
            }
            if (controlKey === 'pageup') {
                lastRawControlKey = 'pageup';
                lastRawControlAt = Date.now();
                consoleState.scrollMessageDetailPage(-1);
                renderScreen();
                return;
            }
            if (controlKey === 'pagedown') {
                lastRawControlKey = 'pagedown';
                lastRawControlAt = Date.now();
                consoleState.scrollMessageDetailPage(1);
                renderScreen();
                return;
            }
            if (controlKey === 'home') {
                lastRawControlKey = 'home';
                lastRawControlAt = Date.now();
                consoleState.scrollMessageDetailToEdge('start');
                renderScreen();
                return;
            }
            if (controlKey === 'end') {
                lastRawControlKey = 'end';
                lastRawControlAt = Date.now();
                consoleState.scrollMessageDetailToEdge('end');
                renderScreen();
                return;
            }
            if (controlKey === 'escape') {
                lastRawControlKey = 'escape';
                lastRawControlAt = Date.now();
                dismissConsoleFocusLayer();
                return;
            }
            return;
        }
        if (hasMessageFocus()) {
            if (controlKey === 'down') {
                lastRawControlKey = 'down';
                lastRawControlAt = Date.now();
                consoleState.moveMessageSelection(1);
                renderScreen();
                return;
            }
            if (controlKey === 'up') {
                lastRawControlKey = 'up';
                lastRawControlAt = Date.now();
                consoleState.moveMessageSelection(-1);
                renderScreen();
                return;
            }
            if (controlKey === 'pageup') {
                lastRawControlKey = 'pageup';
                lastRawControlAt = Date.now();
                consoleState.moveMessageSelectionPage(-1);
                renderScreen();
                return;
            }
            if (controlKey === 'pagedown') {
                lastRawControlKey = 'pagedown';
                lastRawControlAt = Date.now();
                consoleState.moveMessageSelectionPage(1);
                renderScreen();
                return;
            }
            if (controlKey === 'home') {
                lastRawControlKey = 'home';
                lastRawControlAt = Date.now();
                consoleState.selectFirstMessage();
                renderScreen();
                return;
            }
            if (controlKey === 'end') {
                lastRawControlKey = 'end';
                lastRawControlAt = Date.now();
                consoleState.selectLastMessage();
                renderScreen();
                return;
            }
            if (controlKey === 'return') {
                lastRawControlKey = 'return';
                lastRawControlAt = Date.now();
                consoleState.openMessageDetail();
                renderScreen();
                return;
            }
            if (controlKey === 'escape') {
                lastRawControlKey = 'escape';
                lastRawControlAt = Date.now();
                dismissConsoleFocusLayer();
                return;
            }
            return;
        }
        if (hasSessionFocus()) {
            if (controlKey === 'down') {
                lastRawControlKey = 'down';
                lastRawControlAt = Date.now();
                consoleState.moveSessionSelection(1);
                renderScreen();
                return;
            }
            if (controlKey === 'up') {
                lastRawControlKey = 'up';
                lastRawControlAt = Date.now();
                consoleState.moveSessionSelection(-1);
                renderScreen();
                return;
            }
            if (controlKey === 'pageup') {
                lastRawControlKey = 'pageup';
                lastRawControlAt = Date.now();
                consoleState.moveSessionSelectionPage(-1);
                renderScreen();
                return;
            }
            if (controlKey === 'pagedown') {
                lastRawControlKey = 'pagedown';
                lastRawControlAt = Date.now();
                consoleState.moveSessionSelectionPage(1);
                renderScreen();
                return;
            }
            if (controlKey === 'home') {
                lastRawControlKey = 'home';
                lastRawControlAt = Date.now();
                consoleState.selectFirstSession();
                renderScreen();
                return;
            }
            if (controlKey === 'end') {
                lastRawControlKey = 'end';
                lastRawControlAt = Date.now();
                consoleState.selectLastSession();
                renderScreen();
                return;
            }
            if (controlKey === 'return') {
                lastRawControlKey = 'return';
                lastRawControlAt = Date.now();
                const selected = consoleState?.selectedSession;
                if (selected) {
                    void switchSession(selected.id).then(() => {
                        exitSessionFocus();
                    });
                } else {
                    exitSessionFocus();
                }
                return;
            }
            if (controlKey === 'escape') {
                lastRawControlKey = 'escape';
                lastRawControlAt = Date.now();
                dismissConsoleFocusLayer();
                return;
            }
            return;
        }
        const mouse = parseTerminalMouseEvent(chunk);
        if (mouse) {
            if (mouse.button === 64) {
                adjustTranscriptScroll(3);
                return;
            }
            if (mouse.button === 65) {
                adjustTranscriptScroll(-3);
                return;
            }
            if (mouse.release) {
                transcriptScrollbarDragging = false;
                return;
            }
            const dragButton = mouse.button >= 32 ? mouse.button - 32 : mouse.button;
            if (isScrollbarMouseEvent(mouse) && dragButton === 0) {
                transcriptScrollbarDragging = true;
                scrollTranscriptToMouseRow(mouse.y);
                return;
            }
            if (transcriptScrollbarDragging && dragButton === 0) {
                scrollTranscriptToMouseRow(mouse.y);
                return;
            }
        }
        if (rawText === '\u001b\r' || rawText === '\u001b\n') {
            if (shouldRouteDraftNavigation()) {
                void routeConsoleInputChunk(rawText, { submitOnEnter: false, altKey: true });
            }
            return;
        }
        if (activeTextPrompt && !controlKey && (rawText.includes('\r') || rawText.includes('\n'))) {
            const promptChunk = parseTerminalTextPromptChunk(rawText);
            if (promptChunk.text) {
                applyChunkToDraft(promptChunk.text);
            }
            if (promptChunk.submitted) {
                resolveTextPrompt(currentDraft);
            }
            return;
        }
        if ((rawText.includes('\r') || rawText.includes('\n')) && !controlKey) {
            const shouldSubmit = shouldSubmitConsoleTextChunk(rawText);
            const suppressionKey = resolveConsoleRawKeypressSuppressionKey({
                rawText,
                submitTriggered: shouldSubmit
            });
            if (suppressionKey) {
                lastRawControlKey = suppressionKey;
                lastRawControlAt = Date.now();
            }
            void routeConsoleInputChunk(rawText, {
                submitOnEnter: shouldSubmit
            });
            return;
        }
        if (activeTextPrompt && controlKey === 'escape') {
            lastRawControlKey = 'escape';
            lastRawControlAt = Date.now();
            cancelTextPrompt();
            return;
        }
        if (controlKey === 'return') {
            lastRawControlKey = 'return';
            lastRawControlAt = Date.now();
            if (activeTextPrompt) {
                resolveTextPrompt(currentDraft);
                return;
            }
            if (!modalPromptActive && !inputLocked) {
                void routeConsoleInputChunk(rawText, { submitOnEnter: true });
            }
            return;
        }
        if (controlKey === 'left' || controlKey === 'right' || controlKey === 'home' || controlKey === 'end') {
            lastRawControlKey = controlKey;
            lastRawControlAt = Date.now();
            if (shouldRouteDraftNavigation()) {
                applyChunkToDraft(chunk);
            }
            return;
        }
        if ((controlKey === 'up' || controlKey === 'down') && shouldRouteDraftNavigation()) {
            return;
        }
        if (controlKey === 'pageup') {
            lastRawControlKey = 'pageup';
            lastRawControlAt = Date.now();
            adjustTranscriptScroll(getTranscriptPageStep());
            return;
        }
        if (controlKey === 'pagedown') {
            lastRawControlKey = 'pagedown';
            lastRawControlAt = Date.now();
            adjustTranscriptScroll(-getTranscriptPageStep());
            return;
        }
        if (controlKey === 'escape' && transcriptScrollOffset > 0) {
            lastRawControlKey = 'escape';
            lastRawControlAt = Date.now();
            jumpTranscriptScroll('end');
            return;
        }
        if (controlKey === 'up' || controlKey === 'down' || controlKey === 'tab' || controlKey === 'escape') {
            return;
        }
        if (shouldRouteDraftNavigation()) {
            applyChunkToDraft(rawText);
        }
        if (!inputLocked) {
            scheduleDraftRefresh();
        }
        return;
    };
    process.stdin.on('data', stdinDataHandler);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.resume();
    if (process.stdin.isTTY) {
        if (useAlternateScreen) {
            process.stdout.write('\x1b[?1049h');
        }
        clearTerminalScreen(false);
        process.stdin.setRawMode?.(true);
    }
    keypressHandler = (_str, key) => {
        if (isClosed) {
            return;
        }
        if (shouldSuppressConsoleDuplicatedKeypress({
            lastRawKey: lastRawControlKey,
            lastRawAt: lastRawControlAt,
            now: Date.now(),
            keyName: key?.name,
            text: _str
        })) {
            return;
        }
        if (key?.ctrl && key.name === 'c') {
            isClosed = true;
            void cleanupAndExit('Closing session...', true, false, getRetainedBrandLines());
            return;
        }
        if (handleTerminalMenuKey(terminalMenuController, key?.name || '', _str || '', { render: queueRenderScreen })) {
            return;
        }
        if (hasMessageDetailFocus()) {
            if (key?.name === 'y') {
                copyFocusedText(resolveCopyText('selected'), 'selected message');
                return;
            }
            if (key?.name === 'down') {
                consoleState.scrollMessageDetail(1);
                renderScreen();
                return;
            }
            if (key?.name === 'up') {
                consoleState.scrollMessageDetail(-1);
                renderScreen();
                return;
            }
            if (key?.name === 'left') {
                consoleState.scrollMessageDetailColumns(-4);
                renderScreen();
                return;
            }
            if (key?.name === 'right') {
                consoleState.scrollMessageDetailColumns(4);
                renderScreen();
                return;
            }
            if (key?.name === 'pageup') {
                consoleState.scrollMessageDetailPage(-1);
                renderScreen();
                return;
            }
            if (key?.name === 'pagedown') {
                consoleState.scrollMessageDetailPage(1);
                renderScreen();
                return;
            }
            if (key?.name === 'home') {
                consoleState.scrollMessageDetailToEdge('start');
                renderScreen();
                return;
            }
            if (key?.name === 'end') {
                consoleState.scrollMessageDetailToEdge('end');
                renderScreen();
                return;
            }
            if (key?.name === 'escape' || key?.name === 'q') {
                dismissConsoleFocusLayer();
                return;
            }
            return;
        }
        if (hasMessageFocus()) {
            if (key?.name === 'y') {
                copyFocusedText(resolveCopyText('selected'), 'selected message');
                return;
            }
            if (key?.name === 'down') {
                consoleState.moveMessageSelection(1);
                renderScreen();
                return;
            }
            if (key?.name === 'up') {
                consoleState.moveMessageSelection(-1);
                renderScreen();
                return;
            }
            if (key?.name === 'pageup') {
                consoleState.moveMessageSelectionPage(-1);
                renderScreen();
                return;
            }
            if (key?.name === 'pagedown') {
                consoleState.moveMessageSelectionPage(1);
                renderScreen();
                return;
            }
            if (key?.name === 'home') {
                consoleState.selectFirstMessage();
                renderScreen();
                return;
            }
            if (key?.name === 'end') {
                consoleState.selectLastMessage();
                renderScreen();
                return;
            }
            if (key?.name === 'return') {
                consoleState.openMessageDetail();
                renderScreen();
                return;
            }
            if (key?.name === 'escape' || key?.name === 'q') {
                dismissConsoleFocusLayer();
                return;
            }
            return;
        }
        if (hasSessionFocus()) {
            if (key?.name === 'y') {
                copyFocusedText(consoleState?.selectedSession?.id || '', 'selected session id');
                return;
            }
            if (key?.name === 'down') {
                consoleState.moveSessionSelection(1);
                renderScreen();
                return;
            }
            if (key?.name === 'up') {
                consoleState.moveSessionSelection(-1);
                renderScreen();
                return;
            }
            if (key?.name === 'pageup') {
                consoleState.moveSessionSelectionPage(-1);
                renderScreen();
                return;
            }
            if (key?.name === 'pagedown') {
                consoleState.moveSessionSelectionPage(1);
                renderScreen();
                return;
            }
            if (key?.name === 'home') {
                consoleState.selectFirstSession();
                renderScreen();
                return;
            }
            if (key?.name === 'end') {
                consoleState.selectLastSession();
                renderScreen();
                return;
            }
            if (key?.name === 'return') {
                const selected = consoleState?.selectedSession;
                if (selected) {
                    void switchSession(selected.id).then(() => {
                        exitSessionFocus();
                    });
                } else {
                    exitSessionFocus();
                }
                return;
            }
            if (key?.name === 'escape' || key?.name === 'q') {
                dismissConsoleFocusLayer();
                return;
            }
            return;
        }
        if (key?.name === 'pageup') {
            adjustTranscriptScroll(8);
            return;
        }
        if (key?.name === 'pagedown') {
            adjustTranscriptScroll(-8);
            return;
        }
        if ((key?.name === 'escape' || key?.name === 'q') && transcriptScrollOffset > 0) {
            jumpTranscriptScroll('end');
            return;
        }
        if ((key?.ctrl || key?.meta) && key?.name === 'return' && shouldRouteDraftNavigation()) {
            void routeConsoleInputChunk(key?.meta ? '\u001b\r' : '\r', {
                submitOnEnter: false,
                ctrlKey: !!key?.ctrl,
                altKey: !!key?.meta
            });
            return;
        }
        if (activeTextPrompt && key?.name === 'escape') {
            cancelTextPrompt();
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
                void routeConsoleInputChunk('\r', { submitOnEnter: true });
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
            consoleState?.moveSelectMenu?.(1);
            renderScreen();
        } else if (key?.name === 'up') {
            consoleState?.moveSelectMenu?.(-1);
            renderScreen();
            return;
        } else if (key?.name === 'escape') {
            void consoleState?.cancelSelectMenu?.().then(() => {
                syncDraftFromConsoleState();
                renderScreen();
            });
            return;
        } else if (key?.name === 'return') {
            void consoleState?.confirmSelectMenu?.().then(() => {
                syncDraftFromConsoleState();
                renderScreen();
            });
            return;
        } else if (key?.name === 'tab') {
            void consoleState?.confirmSelectMenu?.().then(() => {
                syncDraftFromConsoleState();
                renderScreen();
            });
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
        void cleanupAndExit('Closing session...', true, false, getRetainedBrandLines());
    };
    process.on('SIGINT', sigintHandler);

    try {
        currentProfile = await ensureInteractiveProfile();
        await createChatContext(currentProfile);
    } catch (error: any) {
        if (error instanceof ChatExitRequest) {
            isClosed = true;
            await cleanupAndExit('Closing session...', true, false, getRetainedBrandLines());
            return;
        }
        process.stdout.write(`${error.message}\n`);
        isClosed = true;
        await cleanupAndExit('Closing session...', true, false, getRetainedBrandLines());
        return;
    }

    renderTimer = setInterval(() => {
        if (isClosed || !viewModel) {
            return;
        }
        if (!approvalPromptActive && consoleState?.pendingApprovals?.length) {
            void maybePromptPendingApproval();
        }
        if (!modalPromptActive && !inputLocked
            && (viewModel.runningTools?.length || viewModel.status === 'running' || viewModel.status === 'reasoning')) {
            spinnerIndex = (spinnerIndex + 1) % SPINNER_FRAMES.length;
        }
        if (consoleState?.setWorkingFrame) {
            consoleState.setWorkingFrame(SPINNER_FRAMES[spinnerIndex % SPINNER_FRAMES.length]);
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
