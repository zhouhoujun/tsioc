#!/usr/bin/env node
import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { getDisplayWidth, sliceByDisplayWidth } from '@tsdi/components/console';
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
const SPINNER_FRAMES = ['◦', '◌', '◎', '◉'];
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
const SELECT_MENU_VISIBLE_OPTIONS = 12;

const ANSI = {
    reset: '\x1b[0m',
    red: '\x1b[38;2;248;81;73m',
    dim: '\x1b[38;2;110;118;129m',
    text: '\x1b[38;2;201;209;217m',
    blue: '\x1b[38;2;121;192;255m',
    blueStrong: '\x1b[1m\x1b[38;2;143;208;255m',
    green: '\x1b[1m\x1b[38;2;126;231;135m',
    amber: '\x1b[38;2;255;184;107m',
    bg: '\x1b[48;2;27;33;40m',
    bgSelected: '\x1b[48;2;19;32;43m',
    bgUser: '\x1b[48;2;26;37;31m'
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
    return sliceByDisplayWidth(plain, width);
}

function paint(value: string, ...codes: string[]): string {
    const prefix = codes.filter(Boolean).join('');
    return prefix ? `${prefix}${value}${ANSI.reset}` : value;
}

function paintActive(value: string, ...codes: string[]): string {
    return paint(` ${value} `, ...codes);
}

function paintBlock(value: string, width: number, ...codes: string[]): string {
    const innerWidth = Math.max(0, width - 2);
    return paint(` ${padDisplayText(value, innerWidth)} `, ...codes);
}

function padDisplayText(value: string, width: number): string {
    const plain = String(value || '');
    const plainWidth = getDisplayWidth(plain);
    if (plainWidth >= width) {
        return sliceByDisplayWidth(plain, width);
    }
    return `${plain}${' '.repeat(width - plainWidth)}`;
}

type TerminalControlKey =
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'home'
    | 'end'
    | 'pageup'
    | 'pagedown'
    | 'return'
    | 'escape'
    | 'tab';

export function parseTerminalControlKey(chunk: Buffer | string): TerminalControlKey | undefined {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
    if (!text) {
        return undefined;
    }
    if (text === '\r' || text === '\n') {
        return 'return';
    }
    if (text === '\t') {
        return 'tab';
    }
    if (text === '\u001b') {
        return 'escape';
    }
    if (text === '\u001b[A' || text === '\u001bOA' || /^\u001b\[\d+(;\d+)*A$/.test(text)) {
        return 'up';
    }
    if (text === '\u001b[B' || text === '\u001bOB' || /^\u001b\[\d+(;\d+)*B$/.test(text)) {
        return 'down';
    }
    if (text === '\u001b[C' || text === '\u001bOC' || /^\u001b\[\d+(;\d+)*C$/.test(text)) {
        return 'right';
    }
    if (text === '\u001b[D' || text === '\u001bOD' || /^\u001b\[\d+(;\d+)*D$/.test(text)) {
        return 'left';
    }
    if (text === '\u001b[H' || text === '\u001bOH' || text === '\u001b[1~' || text === '\u001b[7~') {
        return 'home';
    }
    if (text === '\u001b[F' || text === '\u001bOF' || text === '\u001b[4~' || text === '\u001b[8~') {
        return 'end';
    }
    if (text === '\u001b[5~' || text === '\u001b[5;2~') {
        return 'pageup';
    }
    if (text === '\u001b[6~' || text === '\u001b[6;2~') {
        return 'pagedown';
    }
    return undefined;
}

function isTerminalNavigationChunk(chunk: Buffer | string): boolean {
    return !!parseTerminalControlKey(chunk);
}

export function shouldPlaceTerminalCursor(state: {
    isTTY: boolean;
    isSelecting: boolean;
    hasBlockingSelectMenu: boolean;
    inputLocked: boolean;
    modalPromptActive: boolean;
    hasActiveTextPrompt: boolean;
    hasSessionFocus: boolean;
    hasMessageFocus: boolean;
    hasMessageDetailFocus: boolean;
}): boolean {
    if (!state.isTTY || state.isSelecting || state.hasBlockingSelectMenu) {
        return false;
    }
    if (state.hasSessionFocus || state.hasMessageFocus || state.hasMessageDetailFocus) {
        return false;
    }
    if (state.modalPromptActive || state.inputLocked) {
        return state.hasActiveTextPrompt;
    }
    return true;
}

export function shouldSuppressDuplicatedKeypress(state: {
    lastRawKey?: string;
    lastRawAt?: number;
    now: number;
    keyName?: string;
    text?: string;
}): boolean {
    const rawKey = state.lastRawKey || '';
    if (!rawKey || !state.lastRawAt || state.now - state.lastRawAt > 40) {
        return false;
    }
    const keyName = state.keyName || '';
    if (keyName && rawKey === keyName) {
        return true;
    }
    if (state.text && /^\d$/.test(state.text) && rawKey === 'digit') {
        return true;
    }
    return false;
}

export function compactRenderedLines(lines: string[], maxRows: number): string[] {
    const isPaintedBlankLine = (value: string): boolean => {
        const rendered = String(value || '');
        return /\x1b\[[0-9;]*m/.test(rendered) && !stripAnsi(rendered).trim();
    };
    const normalized: string[] = [];
    for (const line of lines) {
        const rendered = String(line || '');
        const isAnsiPainted = /\x1b\[[0-9;]*m/.test(rendered);
        const isBlank = !stripAnsi(rendered).trim() && !isAnsiPainted;
        if (isBlank && (!normalized.length || !stripAnsi(normalized[normalized.length - 1]).trim())) {
            continue;
        }
        normalized.push(line);
    }
    while (normalized.length && !stripAnsi(normalized[0]).trim() && !isPaintedBlankLine(normalized[0])) {
        normalized.shift();
    }
    while (normalized.length && !stripAnsi(normalized[normalized.length - 1]).trim() && !isPaintedBlankLine(normalized[normalized.length - 1])) {
        normalized.pop();
    }
    if (normalized.length <= maxRows) {
        return normalized;
    }
    const trimmed = normalized.slice(normalized.length - Math.max(0, maxRows));
    while (trimmed.length && !stripAnsi(trimmed[0]).trim() && !isPaintedBlankLine(trimmed[0])) {
        trimmed.shift();
    }
    return trimmed;
}

export function buildOsc52ClipboardSequence(text: string): string {
    const payload = Buffer.from(text, 'utf8').toString('base64');
    return `\x1b]52;c;${payload}\x07`;
}

function renderShellBlock(content: string, width: number, ...codes: string[]): string[] {
    const shellWidth = Math.max(24, width);
    const shellInnerWidth = Math.max(8, shellWidth - 6);
    return [
        paint(' '.repeat(shellWidth), ...codes),
        paint(`   ${padDisplayText(content, shellInnerWidth)}   `, ...codes),
        paint(' '.repeat(shellWidth), ...codes)
    ];
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
    const { ComponentFactory } = require('@tsdi/components');
    const { ConsoleRenderer, TuiRenderer } = require('@tsdi/components/console');

    const resolved = resolveCliConfig(options);
    ensureAgentWorkspaceConfig(resolved.root, path.basename(resolved.workspace));
    const historyPath = path.join(resolved.root, HISTORY_FILE);

    let currentSessionId = resolved.sessionId;
    let currentProfile = resolveCliModelConfig(options, resolved.root);
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
    let activeTextPrompt: { question: string; resolve: (value: string) => void; previousLocked: boolean; secret?: boolean } | null = null;
    let isSelecting = false;
    let stdinDataHandler: ((chunk: Buffer | string) => void) | null = null;
    let keypressHandler: ((str: string, key: readline.Key) => void) | null = null;
    let lastRawControlKey = '';
    let lastRawControlAt = 0;
    let resizeHandler: (() => void) | null = null;
    let sigintHandler: (() => void) | null = null;
    let historyEntries: string[] = [];
    let historyIndex = -1;
    let historyDraft = '';
    let isCleaningUp = false;
    let approvalPromptActive = false;
    let mouseTrackingEnabled = false;
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
        const displayDraft = activeTextPrompt?.secret
            ? '*'.repeat(currentDraft.length)
            : formatDisplayDraft(currentDraft, draftCursor);
        consoleState?.setInput?.(displayDraft);
        if (activeTextPrompt?.secret) {
            if (isSuggestionMenu(consoleState?.selectMenu)) {
                consoleState.closeSelectMenu();
            }
            return;
        }
        syncSuggestionMenu();
    };

    const getActiveSelectMenu = (): { title: string; hint?: string; options: SelectMenuOption[]; selectedIndex: number } | undefined => {
        if (consoleState?.selectMenu) {
            return consoleState.selectMenu;
        }
        return selectMenu || undefined;
    };

    const hasBlockingSelectMenu = (): boolean => {
        const activeMenu = getActiveSelectMenu();
        return !!activeMenu && !isSuggestionMenu(activeMenu);
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
        suggestionState = { items: [], selectedIndex: -1 };
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
                suggestionState = { items: [], selectedIndex: -1 };
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
        process.stdout.write(enabled ? '\x1b[?1000h\x1b[?1006h' : '\x1b[?1000l\x1b[?1006l');
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
            suggestionState = { items: [], selectedIndex: -1 };
            consoleState?.closeSelectMenu?.();
            updateDraftState('', 0);
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
            if (consoleState) {
                consoleState.selectMenuAction = resolveSelection;
            }
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
        const parsed = parseSlashCommandLine(input);
        if (!parsed.command.startsWith('/')) {
            return parsed.raw;
        }
        const resolvedCommand = resolveUniqueCommandPrefix(parsed.command, viewModel?.commandHints || getChatCommands());
        return parsed.args ? `${resolvedCommand} ${parsed.args}` : resolvedCommand;
    };

    const getMatchingSlashCommands = (input: string): string[] => {
        const parsed = parseSlashCommandLine(input);
        if (!parsed.command.startsWith('/')) {
            return [];
        }
        return (viewModel?.commandHints || getChatCommands()).filter((item: string) => item.startsWith(parsed.command));
    };

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
                `Base URL: ${resolveProviderBaseUrl(item.provider) || '(custom)'}`
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
                    `Model: ${item}`,
                    `API key env: ${resolveProviderApiKeyEnv(provider) || '-'}`
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
    ): Promise<{ provider: string; flashModel: string; strongModel: string; baseUrl?: string; apiKeyEnv?: string } | undefined> => {
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
                || resolveProviderBaseUrl(provider)
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
                baseUrl,
                apiKeyEnv: flashCurrent?.apiKeyEnv || strongCurrent?.apiKeyEnv || resolveProviderApiKeyEnv(provider)
            };
        } finally {
            closeSelectInteraction();
        }
    };

    const buildAdaptiveModelProfile = (
        selected: { provider: string; flashModel: string; strongModel: string; baseUrl?: string; apiKeyEnv?: string },
        apiKey: string,
        timeoutMs: number
    ): AgentCliProviderProfile => {
        return {
            provider: selected.provider,
            model: selected.flashModel,
            apiKey,
            baseUrl: selected.baseUrl,
            apiKeyEnv: selected.apiKeyEnv,
            timeoutMs,
            defaultProfile: 'flash',
            profiles: {
                flash: {
                    provider: selected.provider,
                    model: selected.flashModel,
                    baseUrl: selected.baseUrl,
                    apiKeyEnv: selected.apiKeyEnv
                },
                strong: {
                    provider: selected.provider,
                    model: selected.strongModel,
                    baseUrl: selected.baseUrl,
                    apiKeyEnv: selected.apiKeyEnv,
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
        const hasExplicitConfig = !!options.provider || !!options.model || !!options.apiKey || !!options.apiKeyEnv || !!options.baseUrl;
        const resolvedProfile = resolveCliModelConfig(options, resolved.root);
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
        const settingsPath = writeSettingsModelProfile(resolved.root, profile);
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
        const uniqueIds = Array.from(new Set([preferredId, ...ids]));
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
        if (!process.stdout.isTTY || !text) {
            return false;
        }
        process.stdout.write(buildOsc52ClipboardSequence(text));
        return true;
    };

    const copyFocusedText = (text: string, label: string): void => {
        const copied = copyTextToClipboard(text);
        applyScreenNotice(copied
            ? `Copied ${label} to clipboard.`
            : `Nothing to copy for ${label}.`, 1500);
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
        }, agentOptions);
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
        const componentFactory = currentCtx.get(ComponentFactory);
        consoleComponentRef = componentFactory.create(AgentConsoleComponent, { injector: currentCtx });
        viewModel = consoleComponentRef.instance;
        await consoleComponentRef.render();
        consoleState = viewModel.sessionState || consoleComponentRef.injector.get(AgentConsoleSessionState);
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
        viewModel.setCommandAction('/help', async () => {
            await promptSelect('Help', [
                {
                    label: '/model',
                    value: '/model',
                    detail: 'Switch provider and model.'
                },
                {
                    label: '/sessions',
                    value: '/sessions',
                    detail: 'Browse sessions with up/down, enter switch, esc close.'
                },
                {
                    label: '/messages',
                    value: '/messages',
                    detail: 'Browse messages with up/down, enter open, y copy.'
                },
                {
                    label: '/multiline',
                    value: '/multiline',
                    detail: 'Toggle multiline draft mode. Use /send or /cancel.'
                },
                {
                    label: '/copy',
                    value: '/copy',
                    detail: 'Copy the latest assistant reply, screen, input, or selected message.'
                },
                {
                    label: '/approvals',
                    value: '/approvals',
                    detail: 'List or resolve pending approval requests.'
                },
                {
                    label: '@workspace',
                    value: '@workspace',
                    detail: 'Inject current workspace context into the prompt.'
                },
                {
                    label: '/quit',
                    value: '/quit',
                    detail: 'Exit the chat session.'
                }
            ], 0, 'up/down move   enter close   q close');
        });
        viewModel.setCommandAction('/clear', async () => {
            applyScreenNotice('');
            renderScreen();
        });
        viewModel.setCommandAction('/tools', async () => {
            const tools = viewModel.tools || [];
            if (!tools.length) {
                applyScreenNotice('No tools available.', 1500);
                renderScreen();
                return;
            }
            await promptSelect('Tools', tools.map((tool: any) => ({
                label: `${tool.name}${tool.active ? '' : ' [inactive]'}`,
                value: tool.name,
                detail: [
                    `Tool: ${tool.name}`,
                    `Status: ${tool.active ? 'active' : 'inactive'}`,
                    `Toolset: ${tool.toolset || '-'}`,
                    `Activation: ${tool.activationKind || '-'}`
                ].join('\n')
            })), 0, 'up/down move   enter close   q close');
        });
        viewModel.setCommandAction('/model', async () => {
            inputLocked = true;
            currentDraft = '';
            draftCursor = 0;
            suggestionState = { items: [], selectedIndex: -1 };
            applyScreenNotice('');
            renderSelectionNotice();
            try {
                const selected = await resolveProviderModeSelection(currentProfile);
                if (!selected) {
                    return;
                }
                const provider = selected.provider;
                const apiKeyEnv = selected.apiKeyEnv || currentProfile.apiKeyEnv || resolveProviderApiKeyEnv(provider);
                const apiKeyLabel = currentProfile.provider === provider && currentProfile.apiKey ? '******' : 'empty';
                const apiKeyInput = await promptLine(`API key [${apiKeyLabel}]: `, { secret: true });
                assertNoExitInput(apiKeyInput);
                if (isCancelInput(apiKeyInput)) {
                    return;
                }
                const apiKeyFromEnv = apiKeyEnv ? process.env[apiKeyEnv] : undefined;
                const apiKey = apiKeyInput
                    || (currentProfile.provider === provider ? currentProfile.apiKey : '')
                    || apiKeyFromEnv
                    || '';
                if (!apiKey) {
                    applyScreenNotice(`Missing API key for ${provider}.`);
                    return;
                }
                const nextProfile = buildAdaptiveModelProfile(selected, apiKey, currentProfile.timeoutMs || 120000);
                writeSettingsModelProfile(resolved.root, nextProfile);
                await createChatContext(nextProfile);
                applyScreenNotice(`Switched to ${nextProfile.provider} / flash ${selected.flashModel} / strong ${selected.strongModel}`, 1800);
            } catch (error: any) {
                if (error instanceof ChatExitRequest) {
                    isClosed = true;
                    await cleanupAndExit();
                    return;
                }
                applyScreenNotice(`Error: ${error.message}`);
            } finally {
                inputLocked = false;
                renderScreen();
                safePrompt();
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
        if (noticeTimer) {
            clearTimeout(noticeTimer);
            noticeTimer = null;
        }
        if (process.stdin.isTTY) {
            setMouseTracking(false);
            process.stdout.write('\x1b[2J\x1b[H\x1b[?1049l');
            process.stdin.setRawMode?.(false);
        }
        persistHistory();
        viewModel?.dispose?.();
        viewModel = null;
        await consoleComponentRef?.destroy?.();
        consoleComponentRef = null;
        panelRefs = {};
        if (currentCtx) {
            await currentCtx.close();
            currentCtx = null;
        }
        process.stdout.write('\nClosing session...\n');
        process.exit(0);
    };

    function renderScreen() {
        if (isClosed) {
            return;
        }
        const width = Math.max(72, (process.stdout.columns || 100) - 2);
        const height = Math.max(16, process.stdout.rows || 24);
        if (consoleState?.setStatus && viewModel) {
            consoleState.setStatus(viewModel.status);
        }
        if (screenNotice && viewModel) {
            viewModel?.showNotice?.(screenNotice);
        }
        const statusPanel = panelRefs.status?.instance;
        const sessionsPanel = panelRefs.sessions?.instance;
        const messagesPanel = panelRefs.messages?.instance;
        const detailPanel = panelRefs.detail?.instance;
        const activityPanel = panelRefs.activity?.instance;
        const toolsPanel = panelRefs.tools?.instance;
        const workingPanel = panelRefs.working?.instance;
        const toolRunsPanel = panelRefs.toolRuns?.instance;
        const inputPanel = panelRefs.input?.instance;
        const selectPanel = panelRefs.select?.instance;
        const preInputLines: string[] = [];
        const selectLines: string[] = [];
        let inputLines: string[] = [];
        const pushLine = (target: string[], line?: string, ...codes: string[]) => {
            if (!line) {
                return;
            }
            target.push(paint(line, ...codes));
        };
        const pushBlank = (target: string[]) => {
            if (target.length && target[target.length - 1] !== '') {
                target.push('');
            }
        };
        if (!consoleState || !viewModel) {
            if (screenNotice) {
                pushLine(preInputLines, screenNotice, ANSI.dim);
            }
            if (activeTextPrompt?.question) {
                pushBlank(preInputLines);
                pushLine(preInputLines, activeTextPrompt.question, ANSI.dim);
            }
            pushBlank(preInputLines);
            const promptText = `> ${currentDraft}`;
            inputLines = [
                ...renderShellBlock(promptText, width, ANSI.bg, ANSI.text),
                paint(`setup · ${resolved.workspace}`, ANSI.dim)
            ];
            const activeMenu = getActiveSelectMenu();
            if (activeMenu) {
                pushBlank(selectLines);
                pushLine(selectLines, activeMenu.title, ANSI.text);
                pushLine(selectLines, activeMenu.hint, ANSI.dim);
                const visibleStart = activeMenu.options.length <= SELECT_MENU_VISIBLE_OPTIONS
                    ? 0
                    : Math.max(0, Math.min(
                        activeMenu.options.length - SELECT_MENU_VISIBLE_OPTIONS,
                        activeMenu.selectedIndex - Math.floor(SELECT_MENU_VISIBLE_OPTIONS / 2)
                    ));
                activeMenu.options.slice(visibleStart, visibleStart + SELECT_MENU_VISIBLE_OPTIONS).forEach((option, index) => {
                    const absoluteIndex = visibleStart + index;
                    const marker = activeMenu.selectedIndex === absoluteIndex ? '›' : ' ';
                    const label = `${marker} ${absoluteIndex + 1}. ${option.label}`;
                    if (activeMenu.selectedIndex === absoluteIndex) {
                        selectLines.push(paintActive(label, ANSI.bgSelected, ANSI.blueStrong));
                        return;
                    }
                    pushLine(selectLines, label, ANSI.text);
                });
                const selected = activeMenu.options[activeMenu.selectedIndex];
                const detail = selected?.detail;
                const detailLines = typeof detail === 'string'
                    ? detail.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 6)
                    : detail != null
                        ? JSON.stringify(detail, null, 2).split('\n').slice(0, 6)
                        : [];
                if (detailLines.length) {
                    pushLine(selectLines, 'Preview', ANSI.dim);
                    detailLines.forEach(line => pushLine(selectLines, line, ANSI.text));
                }
            }
            const rendered = [
                ...compactRenderedLines(preInputLines, Math.max(0, height - inputLines.length - selectLines.length)),
                ...inputLines,
                ...compactRenderedLines(selectLines, Math.max(0, height))
            ];
            lastRenderedLines = rendered.slice();
            const nextRender = `\x1b[2J\x1b[H${rendered.map((line: string) => fitAnsiLine(line, width)).join('\n')}`;
            if (nextRender === lastRenderKey) {
                placeTerminalCursor(rendered, width);
                return;
            }
            lastRenderKey = nextRender;
            process.stdout.write(nextRender);
            placeTerminalCursor(rendered, width);
            return;
        } else {
            if (statusPanel?.shouldShow) {
                for (let index = 0; index < 6; index++) {
                    const line = statusPanel?.statusLineAt?.(index);
                    if (line) {
                        pushLine(preInputLines, line, ANSI.dim);
                    }
                }
            }
        if (sessionsPanel?.shouldShow) {
            pushBlank(preInputLines);
            pushLine(preInputLines, sessionsPanel.sessionsSummaryLabel, ANSI.amber);
            pushLine(preInputLines, sessionsPanel.sessionsHintLabel, ANSI.dim);
            for (let index = 0; index < 6; index++) {
                const line = sessionsPanel.sessionLabelAt?.(index);
                if (!line) {
                    continue;
                }
                if (line.trimStart().startsWith('›')) {
                    preInputLines.push(paintActive(line, ANSI.bgSelected, ANSI.amber));
                    continue;
                }
                pushLine(preInputLines, line, line.includes(' [current]') ? ANSI.amber : ANSI.text);
            }
        }
        pushBlank(preInputLines);
        if (messagesPanel?.emptyLabel) {
            pushLine(preInputLines, messagesPanel.emptyLabel, ANSI.dim);
        }
        pushLine(preInputLines, messagesPanel?.messagesHintLabel, ANSI.dim);
        const messagesFocused = !!consoleState?.messagesFocused;
        for (let index = 0; index < 7; index++) {
            const role = messagesPanel?.messageRoleAt?.(index) || '';
            const content = messagesPanel?.messageContentAt?.(index) || '';
            const kind = messagesPanel?.messageKindAt?.(index) || '';
            const selected = !!messagesPanel?.messageSelectedAt?.(index) && messagesFocused;
            const line = `${role}${content}`;
            if (!line) {
                continue;
            }
            if (kind === 'you') {
                preInputLines.push(
                    ...renderShellBlock(
                        line,
                        width,
                        ANSI.bg,
                        selected ? ANSI.blueStrong : ANSI.text
                    )
                );
            } else if (kind === 'agent') {
                if (selected) {
                    preInputLines.push(paintActive(line, ANSI.bgSelected, ANSI.blueStrong));
                    continue;
                }
                pushLine(preInputLines, line, ANSI.blue);
            } else {
                pushLine(preInputLines, line, ANSI.text);
            }
        }
        if (detailPanel?.shouldShow) {
            pushBlank(preInputLines);
            pushLine(preInputLines, detailPanel.detailSummaryLabel, ANSI.blue);
            pushLine(preInputLines, detailPanel.detailHintLabel, ANSI.dim);
            for (let index = 0; index < 6; index++) {
                const number = detailPanel.detailLineNumberAt?.(index);
                const content = detailPanel.detailLineContentAt?.(index);
                if (!number && !content) {
                    continue;
                }
                pushLine(preInputLines, `${number || ''}${content || ''}`, ANSI.text);
            }
        }
        if (activityPanel?.shouldShow) {
            pushBlank(preInputLines);
            for (let index = 0; index < 3; index++) {
                const kind = activityPanel.activityKindAt?.(index);
                const message = activityPanel.activityMessageAt?.(index);
                if (!kind && !message) {
                    continue;
                }
                pushLine(preInputLines, `${kind || ''}${message || ''}`, ANSI.text);
            }
        }
        if (workingPanel?.shouldShow) {
            pushBlank(preInputLines);
            const label = workingPanel.workingLabel || '';
            const detail = workingPanel.workingDetail || '';
            preInputLines.push(`${paint(label, ANSI.blueStrong)}${paint(detail, ANSI.text)}`);
        }
        if (toolRunsPanel?.toolRunsSummaryLabel) {
            pushBlank(preInputLines);
            pushLine(preInputLines, toolRunsPanel.toolRunsSummaryLabel, ANSI.blue);
        }
        if (activeTextPrompt?.question) {
            pushBlank(preInputLines);
            pushLine(preInputLines, activeTextPrompt.question, ANSI.dim);
        }
        pushBlank(preInputLines);
        const promptValue = consoleState?.input || '';
        const placeholder = inputPanel?.placeholderLabel || '';
        const promptText = `> ${promptValue || placeholder}`;
        inputLines = [
            ...renderShellBlock(promptText, width, ANSI.bg, ANSI.text),
            paint(inputPanel?.hintLabel || '', ANSI.dim)
        ];
        if (selectPanel?.menu) {
            pushBlank(selectLines);
            pushLine(selectLines, selectPanel.menuTitle, ANSI.text);
            pushLine(selectLines, selectPanel.menuMeta, ANSI.dim);
            for (let index = 0; index < SELECT_MENU_VISIBLE_OPTIONS; index++) {
                const line = selectPanel.optionLabelAt?.(index);
                if (!line) {
                    continue;
                }
                if (line.trimStart().startsWith('›')) {
                    selectLines.push(paintActive(line, ANSI.bgSelected, ANSI.blueStrong));
                    continue;
                }
                pushLine(selectLines, line, ANSI.text);
            }
            pushLine(selectLines, selectPanel.detailTitle, ANSI.dim);
            for (let index = 0; index < 6; index++) {
                const line = selectPanel.detailLineAt?.(index);
                if (line) {
                    pushLine(selectLines, line, ANSI.text);
                }
            }
            pushLine(selectLines, selectPanel.menuHint, ANSI.dim);
        }
        }
        const rendered = [
            ...compactRenderedLines(preInputLines, Math.max(0, height - inputLines.length - selectLines.length)),
            ...inputLines,
            ...compactRenderedLines(selectLines, Math.max(0, height))
        ];
        lastRenderedLines = rendered.slice();
        const nextRender = `\x1b[2J\x1b[H${rendered.map((line: string) => fitAnsiLine(line, width)).join('\n')}`;

        if (nextRender === lastRenderKey) {
            placeTerminalCursor(rendered, width);
            return;
        }
        lastRenderKey = nextRender;
        process.stdout.write(nextRender);
        placeTerminalCursor(rendered, width);
    }

    function placeTerminalCursor(rendered: string[], width: number) {
        if (!shouldPlaceTerminalCursor({
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
    }

    const processInput = async (input: string) => {
        const trimmed = resolveSlashCommand(input);
        if (!trimmed) return;
        const parsed = parseSlashCommandLine(trimmed);
        const command = parsed.command;
        const commandArgs = parsed.args;
        const knownCommands = viewModel?.commandHints || getChatCommands();
        const buildPrompt = (value: string) => enrichPromptWithMentions(value, {
            workspace: resolved.workspace,
            sessionId: currentSessionId,
            provider: currentProfile.provider,
            model: currentProfile.model,
            tools: viewModel?.tools || []
        });

        if (command.startsWith('/') && !knownCommands.includes(command)) {
            const matches = getMatchingSlashCommands(input);
            applyScreenNotice(matches.length
                ? `Ambiguous command: ${input.trim()}  (${matches.join(', ')})`
                : `Unknown command: ${input.trim()}`, 1500);
            renderScreen();
            safePrompt();
            return;
        }

        if (command === '/quit' || command === '/exit') {
            isClosed = true;
            process.stdout.write('\nGoodbye.\n');
            await cleanupAndExit();
            return;
        }

        if (command === '/help') {
            await viewModel.runCommand('/help');
            return;
        }

        if (command === '/clear') {
            await viewModel.runCommand('/clear');
            return;
        }

        if (command === '/multiline') {
            multilineMode = !multilineMode;
            if (!multilineMode) {
                draftLines = [];
            }
            applyScreenNotice(multilineMode
                ? 'Multiline mode enabled. Type /send to submit, /cancel to discard.'
                : 'Multiline mode disabled.', 1500);
            renderScreen();
            safePrompt();
            return;
        }

        if (command === '/cancel') {
            draftLines = [];
            multilineMode = false;
            applyScreenNotice('Multiline draft cleared.', 1500);
            renderScreen();
            safePrompt();
            return;
        }

        if (command === '/tools') {
            await viewModel.runCommand('/tools');
            return;
        }

        if (command === '/sessions') {
            await enterSessionFocus();
            return;
        }

        if (command === '/messages') {
            await enterMessageFocus();
            return;
        }

        if (command === '/session') {
            if (viewModel?.status === 'running' || viewModel?.status === 'reasoning') {
                applyScreenNotice('Wait for the current turn to finish before switching sessions.', 1500);
                renderScreen();
                safePrompt();
                return;
            }
            const sessionIds = await listSessionIds();
            if (commandArgs) {
                await switchSession(commandArgs);
            } else {
                const selected = await promptSelect('Sessions', sessionIds.map(id => ({
                    label: id,
                    value: id,
                    detail: id === currentSessionId
                        ? 'Current session'
                        : 'Switch to this session'
                })), Math.max(0, sessionIds.indexOf(currentSessionId)), 'enter switch   q cancel');
                if (!selected) {
                    renderScreen();
                    safePrompt();
                    return;
                }
                await switchSession(selected);
            }
            renderScreen();
            safePrompt();
            return;
        }

        if (command === '/new') {
            if (viewModel?.status === 'running' || viewModel?.status === 'reasoning') {
                applyScreenNotice('Wait for the current turn to finish before starting a new session.', 1500);
                renderScreen();
                safePrompt();
                return;
            }
            await switchSession(buildChatSessionId(commandArgs));
            renderScreen();
            safePrompt();
            return;
        }

        if (command === '/approvals') {
            const pending = syncPendingApprovals();
            applyScreenNotice(pending.length
                ? [
                    'Pending approvals:',
                    ...pending.map((item: any) => `  - ${item.id.slice(0, 8)} ${item.toolName}: ${item.reason}`)
                ].join('\n')
                : 'Pending approvals:\n  (empty)');
            renderScreen();
            safePrompt();
            return;
        }

        if (command === '/approve') {
            await handleApprovalDecision('approve', commandArgs || undefined);
            renderScreen();
            safePrompt();
            return;
        }

        if (command === '/deny') {
            await handleApprovalDecision('deny', commandArgs || undefined);
            renderScreen();
            safePrompt();
            return;
        }

        if (command === '/copy') {
            const text = resolveCopyText(commandArgs || undefined);
            const copied = copyTextToClipboard(text);
            applyScreenNotice(copied
                ? `Copied ${commandArgs ? commandArgs : 'latest assistant message'} to clipboard.`
                : 'Nothing to copy. Use /copy, /copy screen, /copy input, or /copy selected.', 1500);
            renderScreen();
            safePrompt();
            return;
        }

        if (command === '/send') {
            if (!draftLines.length) {
                applyScreenNotice('No multiline draft to send.', 1500);
                renderScreen();
                safePrompt();
                return;
            }
            const draft = draftLines.join('\n');
            draftLines = [];
            multilineMode = false;
            try {
                applyScreenNotice('');
                viewModel.input = buildPrompt(draft);
                await viewModel.submit();
                await refreshSessionsList(currentSessionId);
                renderScreen();
            } catch (error: any) {
                applyScreenNotice('');
                renderScreen();
            }
            safePrompt();
            return;
        }

        if (command === '/model') {
            await viewModel.runCommand('/model');
            return;
        }

        if (multilineMode) {
            draftLines.push(input);
            applyScreenNotice(`Buffered ${draftLines.length} line${draftLines.length === 1 ? '' : 's'} in multiline draft.`, 1500);
            renderScreen();
            safePrompt();
            return;
        }

        try {
            applyScreenNotice('');
            viewModel.input = buildPrompt(trimmed);
            await viewModel.submit();
            await refreshSessionsList(currentSessionId);
            pushHistoryEntry(trimmed);
            persistHistory();
            renderScreen();
        } catch (error: any) {
            applyScreenNotice('');
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

    const cancelTextPrompt = () => {
        if (!activeTextPrompt) {
            return;
        }
        resolveTextPrompt('cancel');
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
        const controlKey = parseTerminalControlKey(chunk);
        if (hasBlockingSelectMenu()) {
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
            if (controlKey === 'up') {
                lastRawControlKey = 'up';
                lastRawControlAt = Date.now();
                moveActiveMenu(-1);
                return;
            }
            if (controlKey === 'down') {
                lastRawControlKey = 'down';
                lastRawControlAt = Date.now();
                moveActiveMenu(1);
                return;
            }
            if (controlKey === 'return') {
                lastRawControlKey = 'return';
                lastRawControlAt = Date.now();
                confirmActiveMenuSelection();
                return;
            }
            if (controlKey === 'escape' || text.toLowerCase() === 'q') {
                lastRawControlKey = controlKey === 'escape' ? 'escape' : 'q';
                lastRawControlAt = Date.now();
                cancelActiveMenuSelection();
                return;
            }
            if (/^[1-9]$/.test(text)) {
                lastRawControlKey = 'digit';
                lastRawControlAt = Date.now();
                const index = parseInt(text, 10) - 1;
                confirmActiveMenuIndex(index);
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
                consoleState.closeMessageDetail();
                renderScreen();
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
                exitMessageFocus();
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
                exitSessionFocus();
                return;
            }
            return;
        }
        if (activeTextPrompt && controlKey === 'escape') {
            lastRawControlKey = 'escape';
            lastRawControlAt = Date.now();
            cancelTextPrompt();
            return;
        }
        if (controlKey === 'left' || controlKey === 'right' || controlKey === 'home' || controlKey === 'end') {
            lastRawControlKey = controlKey;
            lastRawControlAt = Date.now();
            applyChunkToDraft(chunk);
            if (!inputLocked) {
                renderScreen();
            }
            return;
        }
        if (controlKey === 'up' || controlKey === 'down' || controlKey === 'pageup' || controlKey === 'pagedown' || controlKey === 'return' || controlKey === 'tab' || controlKey === 'escape') {
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
        setMouseTracking(false);
    }
    keypressHandler = (_str, key) => {
        if (isClosed) {
            return;
        }
        if (shouldSuppressDuplicatedKeypress({
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
            void cleanupAndExit();
            return;
        }
        if (hasBlockingSelectMenu()) {
            if (key?.name === 'down') {
                moveActiveMenu(1);
                return;
            }
            if (key?.name === 'up') {
                moveActiveMenu(-1);
                return;
            }
            if (key?.name === 'return') {
                confirmActiveMenuSelection();
                return;
            }
            if (key?.name === 'escape' || key?.name === 'q') {
                cancelActiveMenuSelection();
                return;
            }
            if (/^[1-9]$/.test(_str || '')) {
                confirmActiveMenuIndex(parseInt(_str, 10) - 1);
                return;
            }
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
                consoleState.closeMessageDetail();
                renderScreen();
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
                exitMessageFocus();
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
                exitSessionFocus();
                return;
            }
            return;
        }
        const activeMenu = getActiveSelectMenu();
        if (activeMenu && !isSuggestionMenu(activeMenu)) {
            // Non-suggestion menus always take precedence over draft input.
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

    renderScreen();
    safePrompt();

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
