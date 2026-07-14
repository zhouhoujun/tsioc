import {
    applyConsoleTextInputChunk,
    formatConsoleIndexedOptionLabel,
    formatConsoleSelectOptionTableRow,
    resolveConsoleOptionLabelColumnWidth,
    shouldSkipConsoleHistoryEntry
} from './input';
import { getDisplayWidth, sliceByDisplayWidth } from './display-width';

const CHAT_COMMANDS = ['/help', '/tools', '/model', '/clear', '/multiline', '/send', '/cancel', '/sessions', '/messages', '/session', '/new', '/approvals', '/approve', '/deny', '/copy', '/quit', '/exit'];

export interface SelectMenuOption {
    label: string;
    value: string;
    description?: string;
    detail?: string;
}

export interface SelectMenuMouseEvent {
    button: number;
    x: number;
    y: number;
    release: boolean;
}

export interface TerminalToolRunItem {
    name: string;
    status: 'running' | 'success' | 'error';
    durationMs?: number;
    message: string;
    updatedAt?: number;
}

export interface TerminalActivityItem {
    kind: 'turn' | 'tool' | 'model' | 'error';
    message: string;
    createdAt?: number;
}

export interface MentionContextOptions {
    workspace: string;
    sessionId: string;
    provider: string;
    model: string;
    tools?: Array<{ name: string; toolset?: string; active?: boolean }>;
}

export interface SuggestionItem {
    group: 'Commands' | 'Mentions' | 'Hints';
    label: string;
    value: string;
}

export interface SuggestionState {
    items: SuggestionItem[];
    selectedIndex: number;
}

export interface TerminalDraftState {
    value: string;
    cursor: number;
}

export interface TerminalChatScreenOptions {
    appTitle?: string;
    headerLine: string;
    subHeaderLine: string;
    conversationLines: string[];
    promptQuestion?: string;
    notice?: string;
    latestActivity?: string;
    latestToolRun?: string;
    focusedTool?: string;
    toolsSummary?: string;
    workingTitle?: string;
    workingLines: string[];
    inputLines: string[];
    selectLines: string[];
    statusTitle?: string;
    statusLines: string[];
}

export interface TerminalChatScreenLayout {
    lines: string[];
    contextLines: string[];
    selectMenuScreenRow: number;
}

export interface TerminalPrimaryScreenOptions {
    state?: TerminalPrimaryRenderState;
    topLines?: string[];
    topSections?: TerminalPrimaryScreenSection[];
    transcriptBlocks: string[][];
    footerSections?: TerminalPrimaryScreenSection[];
    height?: number;
    scrollOffset?: number;
    anchorBlockIndex?: number;
    minContextRows?: number;
    overflowLine?: string;
}

export interface TerminalPrimaryScreenSection {
    id?: string;
    lines: string[];
    regions?: TerminalRenderRegion[];
    cursorTargets?: TerminalCursorTarget[];
}

export interface TerminalPrimaryScreenSectionSource {
    id?: string;
    lines?: string[];
    regions?: TerminalRenderRegion[];
    cursorTargets?: TerminalCursorTarget[];
    cursorTarget?: TerminalCursorTarget;
}

export interface TerminalPrimaryScreenLayout {
    lines: string[];
    regions: TerminalRenderRegion[];
    cursorTargets: TerminalCursorTarget[];
    visibleTranscriptLines: string[];
    visibleBottomLines: string[];
    inputStartRow: number;
    transcriptStartRow: number;
    transcriptVisibleRows: number;
    transcriptTotalRows: number;
    transcriptMaxScrollOffset: number;
}

export interface TerminalRenderRegion {
    id: string;
    startRow: number;
    endRow: number;
}

export interface TerminalPrimaryRenderOptions {
    state?: TerminalPrimaryRenderState;
    lines: string[];
    regions?: TerminalRenderRegion[];
    width: number;
    stablePrefixRows?: number;
    cursorRow?: number;
    cursorTarget?: TerminalCursorTarget;
    cursorMode?: 'prompt' | 'bottom';
    placeCursor?: boolean;
}

export interface TerminalPrimaryRenderState {
    renderKey: string;
    paintedLines: string[];
    paintedWidth: number;
    stablePrefixRows: number;
    cursorRow: number;
    cursorTarget?: TerminalCursorTarget;
    terminalRow: number;
    cursorMode: 'prompt' | 'bottom';
    regions: TerminalRenderRegion[];
}

export interface TerminalPrimaryRenderResult {
    output: string;
    fittedLines: string[];
    cursorRow: number;
    terminalRow: number;
    changed: boolean;
    state: TerminalPrimaryRenderState;
}

export interface TerminalCleanupOptions {
    reset?: string;
    alternateScreen?: boolean;
    preserveScreen?: boolean;
    clearScrollback?: boolean;
    retainedLines?: string[];
    paintedLineCount?: number;
    terminalRows?: number;
    currentRow?: number;
    cursorRowOffset?: number;
}

export interface TerminalCursorTarget {
    row: number;
    column: number;
}

export interface TerminalCursorSequenceOptions {
    target: TerminalCursorTarget;
    width: number;
    renderedLineCount?: number;
    currentRow?: number;
    mode?: 'absolute' | 'flow' | 'line' | 'relative';
}

export interface TerminalMenuStateLike {
    title?: string | null;
}

export interface TerminalHeaderOptions {
    provider: string;
    model: string;
    status: string;
    tasksCount: number;
    runningToolsLabel: string;
    width: number;
}

export interface TerminalSubHeaderOptions {
    sessionId: string;
    workspace: string;
    width: number;
}

export interface TerminalConversationOptions {
    renderedLines?: string[];
    messages?: Array<{ role?: string; content: string }>;
    width: number;
    maxLines: number;
}

export interface TerminalKeyPress {
    name?: string;
    ctrl?: boolean;
    meta?: boolean;
}

export type TerminalInputControlKey =
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

export interface TerminalInputSequenceResult {
    text: string;
    controlKey?: TerminalInputControlKey;
    partial: boolean;
}

export interface TerminalMenuController {
    getMenu(): { title?: string; options: SelectMenuOption[]; selectedIndex: number } | undefined;
    move(delta: number): void;
    confirm(): void;
    confirmIndex(index: number): void;
    cancel(): void;
}

export function handleTerminalMenuKey(
    menuController: TerminalMenuController | undefined,
    keyName = '',
    text = '',
    options: { render?: () => void } = {}
): boolean {
    const menu = menuController?.getMenu();
    if (!menu) {
        return false;
    }
    const key = keyName || text;
    const blockingMenu = !isSuggestionMenu(menu);
    if (key === 'down') {
        menuController?.move(1);
        options.render?.();
        return true;
    }
    if (key === 'up') {
        menuController?.move(-1);
        options.render?.();
        return true;
    }
    if (key === 'return' || key === 'tab') {
        menuController?.confirm();
        return true;
    }
    if (key === 'escape') {
        menuController?.cancel();
        return true;
    }
    if (!blockingMenu) {
        return false;
    }
    if (key === 'q') {
        menuController?.cancel();
        return true;
    }
    if (/^[1-9]$/.test(key)) {
        const index = parseInt(key, 10) - 1;
        if (index >= 0 && index < menu.options.length) {
            menuController?.confirmIndex(index);
        }
        return true;
    }
    return false;
}

export function resolveTerminalMenuInputKey(
    keyName = '',
    text = '',
    options: { blockingMenu?: boolean } = {}
): string {
    if (keyName && keyName !== 'escape') {
        return keyName;
    }
    const rawText = String(text || '');
    if (options.blockingMenu && /^[1-9q]$/.test(rawText)) {
        return rawText;
    }
    return '';
}

export function resolveTerminalMenuNextIndex(
    selectedIndex: number,
    optionCount: number,
    delta: number
): number {
    const count = Math.max(0, Math.floor(optionCount || 0));
    if (!count) {
        return -1;
    }
    const current = Math.max(0, Math.min(count - 1, Math.floor(selectedIndex || 0)));
    return (current + delta + count) % count;
}

export function parseTerminalInputControlKey(input: Buffer | string): TerminalInputControlKey | undefined {
    const text = Buffer.isBuffer(input) ? input.toString('utf8') : String(input || '');
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

function isPartialTerminalInputSequence(text: string): boolean {
    return text === '\u001b' || text === '\u001b[' || text === '\u001bO' || /^\u001b\[[0-9;]*$/.test(text);
}

export class TerminalInputSequenceDecoder {
    protected pending = '';

    decode(input: Buffer | string): TerminalInputSequenceResult {
        const next = Buffer.isBuffer(input) ? input.toString('utf8') : String(input || '');
        const text = `${this.pending}${next}`;
        const controlKey = parseTerminalInputControlKey(text);
        if (controlKey && !(controlKey === 'escape' && isPartialTerminalInputSequence(text))) {
            this.pending = '';
            return { text, controlKey, partial: false };
        }
        if (isPartialTerminalInputSequence(text)) {
            this.pending = text;
            return { text: '', partial: true };
        }
        this.pending = '';
        return { text, partial: false };
    }

    reset(): void {
        this.pending = '';
    }

    hasPendingSequence(): boolean {
        return !!this.pending;
    }
}

export interface TerminalUiControllerOptions {
    getCommands: () => string[];
    getMentionCandidates: () => string[];
    render: () => void;
    setDraftDisplay: (displayDraft: string) => void;
    submit: (value: string) => Promise<void> | void;
    isClosed: () => boolean;
    isInputLocked: () => boolean;
    isModalPromptActive: () => boolean;
    isSelecting: () => boolean;
    menu?: TerminalMenuController;
}

export function getChatCommands(): string[] {
    return CHAT_COMMANDS.slice();
}

export function buildClearScreenSequence(clearScrollback = false): string {
    return `\x1b[2J${clearScrollback ? '\x1b[3J' : ''}\x1b[H`;
}

export function buildTerminalCleanupSequence(options: TerminalCleanupOptions = {}): string {
    const reset = options.reset || '';
    const retainedLines = options.retainedLines || [];
    if (options.alternateScreen) {
        if (options.preserveScreen) {
            return [
                `${reset}\x1b[?1049l`,
                options.clearScrollback ? buildClearScreenSequence(true) : '',
                retainedLines.length ? `${retainedLines.join('\n')}\n` : ''
            ].join('');
        }
        if (options.clearScrollback) {
            return `\x1b[?1049l${buildClearScreenSequence(true)}`;
        }
        return `${buildClearScreenSequence()}\x1b[?1049l`;
    }
    if (options.clearScrollback) {
        return `${reset}${buildClearScreenSequence(true)}${retainedLines.length ? `${retainedLines.join('\n')}\n` : ''}`;
    }
    if (options.preserveScreen) {
        const paintedLineCount = Math.max(0, Math.floor(options.paintedLineCount || 0));
        const currentRow = Math.max(0, Math.floor(options.currentRow ?? Math.max(0, paintedLineCount - 1)));
        const linesDown = Math.max(0, paintedLineCount - currentRow);
        return `${reset}${linesDown > 0 ? `\x1b[${linesDown}B` : ''}\r`;
    }
    const clearRows = Math.max(1, options.terminalRows || 0, options.paintedLineCount || 0);
    const clearCommands: string[] = [];
    for (let index = 0; index < clearRows; index++) {
        clearCommands.push(`\x1b[${index + 1};1H\x1b[2K`);
    }
    return `${reset}${clearCommands.join('')}\x1b[1;1H`;
}

export function buildTerminalCursorSequence(options: TerminalCursorSequenceOptions): string {
    const target = options.target;
    const cursorColumn = Math.min(
        Math.max(1, options.width || 1),
        Math.max(0, Math.floor(target.column || 0)) + 1
    );
    const targetRow = Math.max(0, Math.floor(target.row || 0));
    const mode = options.mode || 'absolute';
    if (mode === 'line') {
        return `\r${cursorColumn > 1 ? `\x1b[${cursorColumn - 1}C` : ''}`;
    }
    if (mode === 'relative') {
        const currentRow = Math.max(0, Math.floor(options.currentRow || 0));
        const delta = targetRow - currentRow;
        return `${delta < 0 ? `\x1b[${Math.abs(delta)}A` : ''}${delta > 0 ? `\x1b[${delta}B` : ''}\r${cursorColumn > 1 ? `\x1b[${cursorColumn - 1}C` : ''}`;
    }
    if (mode === 'flow') {
        const lineCount = Math.max(0, Math.floor(options.renderedLineCount || 0));
        const linesAfterTarget = Math.max(0, lineCount - targetRow - 1);
        return `${linesAfterTarget > 0 ? `\x1b[${linesAfterTarget}A` : ''}\r${cursorColumn > 1 ? `\x1b[${cursorColumn - 1}C` : ''}`;
    }
    return `\x1b[${targetRow + 1};${cursorColumn}H`;
}

function stripAnsi(value: string): string {
    return String(value || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function fitAnsiLine(line: string, width: number): string {
    const plain = stripAnsi(line);
    if (getDisplayWidth(plain) <= width) {
        return line;
    }
    return sliceByDisplayWidth(plain, width);
}

function compactTerminalRenderedLines(lines: string[], maxRows: number): string[] {
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

function windowTerminalLinesFromBottom(lines: string[], maxRows: number, scrollOffset = 0): { lines: string[]; startRow: number; totalRows: number } {
    if (maxRows <= 0) {
        return { lines: [], startRow: 0, totalRows: lines.length };
    }
    const totalRows = lines.length;
    if (totalRows <= maxRows) {
        return { lines: lines.slice(), startRow: 0, totalRows };
    }
    const boundedOffset = Math.max(0, Math.min(scrollOffset, totalRows - maxRows));
    const startRow = Math.max(0, totalRows - maxRows - boundedOffset);
    return {
        lines: lines.slice(startRow, startRow + maxRows),
        startRow,
        totalRows
    };
}

function windowTerminalBlocksFromBottomWithContext(blocks: string[][], maxRows: number, minLatestRows = 0): { lines: string[]; startRow: number; totalRows: number } {
    if (maxRows <= 0) {
        return { lines: [], startRow: 0, totalRows: 0 };
    }
    const normalizedBlocks = blocks
        .map(block => compactTerminalRenderedLines(block, block.length || 0))
        .filter(block => block.length > 0);
    const totalRows = normalizedBlocks.reduce((sum, block) => sum + block.length, 0);
    if (totalRows <= maxRows) {
        return {
            lines: normalizedBlocks.flatMap(block => block),
            startRow: 0,
            totalRows
        };
    }
    const latestBlock = normalizedBlocks[normalizedBlocks.length - 1] || [];
    const latestRows = Math.min(latestBlock.length, Math.max(0, minLatestRows), maxRows);
    const latestTail = latestRows > 0 ? latestBlock.slice(latestBlock.length - latestRows) : [];
    const remainingRows = Math.max(0, maxRows - latestTail.length);
    const precedingLines = normalizedBlocks
        .slice(0, latestRows >= latestBlock.length ? -1 : normalizedBlocks.length)
        .flatMap(block => block);
    const precedingWindow = windowTerminalLinesFromBottom(precedingLines, remainingRows, 0);
    const lines = [
        ...precedingWindow.lines,
        ...latestTail
    ].slice(-maxRows);
    return {
        lines,
        startRow: Math.max(0, totalRows - lines.length),
        totalRows
    };
}

function windowTerminalBlocksAroundAnchor(blocks: string[][], maxRows: number, anchorIndex = -1): { lines: string[]; startRow: number; totalRows: number } {
    if (maxRows <= 0) {
        return { lines: [], startRow: 0, totalRows: 0 };
    }
    const normalizedBlocks = blocks
        .map(block => compactTerminalRenderedLines(block, block.length || 0))
        .filter(block => block.length > 0);
    const totalRows = normalizedBlocks.reduce((sum, block) => sum + block.length, 0);
    if (totalRows <= maxRows) {
        return {
            lines: normalizedBlocks.flatMap(block => block),
            startRow: 0,
            totalRows
        };
    }
    const safeAnchor = anchorIndex >= 0
        ? Math.max(0, Math.min(anchorIndex, normalizedBlocks.length - 1))
        : normalizedBlocks.length - 1;
    const lines: string[] = [];
    let startBlock = safeAnchor;
    let endBlock = safeAnchor;
    while (startBlock >= 0 || endBlock < normalizedBlocks.length) {
        const candidateBlocks = normalizedBlocks.slice(Math.max(0, startBlock), Math.min(normalizedBlocks.length, endBlock + 1));
        const candidateLines = candidateBlocks.flatMap(block => block);
        if (candidateLines.length > maxRows) {
            break;
        }
        lines.splice(0, lines.length, ...candidateLines);
        const canGrowBefore = startBlock > 0;
        const canGrowAfter = endBlock < normalizedBlocks.length - 1;
        if (canGrowAfter) {
            endBlock += 1;
        } else if (canGrowBefore) {
            startBlock -= 1;
        } else {
            break;
        }
    }
    const compacted = compactTerminalRenderedLines(lines, maxRows);
    return {
        lines: compacted,
        startRow: Math.max(0, totalRows - compacted.length),
        totalRows
    };
}

function normalizeTerminalScreenSections(sections?: TerminalPrimaryScreenSection[]): TerminalPrimaryScreenSection[] {
    return (sections || [])
        .map(section => ({
            ...section,
            lines: (section.lines || []).slice(),
            regions: (section.regions || []).slice(),
            cursorTargets: (section.cursorTargets || []).slice()
        }))
        .filter(section => section.lines.length > 0);
}

export function composeTerminalScreenSections(
    ...sources: Array<TerminalPrimaryScreenSectionSource | string[] | null | undefined | false>
): TerminalPrimaryScreenSection[] {
    const sections: TerminalPrimaryScreenSection[] = [];
    sources.forEach(source => {
        if (!source) {
            return;
        }
        if (Array.isArray(source)) {
            if (source.length) {
                sections.push({ lines: source.slice() });
            }
            return;
        }
        const lines = (source.lines || []).slice();
        if (!lines.length) {
            return;
        }
        sections.push({
            id: source.id,
            lines,
            regions: (source.regions || []).slice(),
            cursorTargets: source.cursorTargets?.length
                ? source.cursorTargets.slice()
                : source.cursorTarget ? [source.cursorTarget] : []
        });
    });
    return sections;
}

function createTerminalScreenSection(id: string, lines: string[] = []): TerminalPrimaryScreenSection | undefined {
    return lines.length ? { id, lines } : undefined;
}

function flattenTerminalScreenSections(sections: TerminalPrimaryScreenSection[]): string[] {
    return sections.flatMap(section => section.lines || []);
}

function collectTerminalSectionRegions(
    sections: TerminalPrimaryScreenSection[],
    startRow: number,
    visibleStartRow: number,
    visibleEndRow: number
): TerminalRenderRegion[] {
    const regions: TerminalRenderRegion[] = [];
    let offset = startRow;
    sections.forEach(section => {
        const sectionStart = offset;
        const sectionEnd = sectionStart + section.lines.length;
        if (section.id) {
            regions.push({ id: section.id, startRow: sectionStart, endRow: sectionEnd });
        }
        (section.regions || []).forEach(region => {
            regions.push({
                id: region.id,
                startRow: sectionStart + region.startRow,
                endRow: sectionStart + region.endRow
            });
        });
        offset = sectionEnd;
    });
    return regions
        .map(region => ({
            id: region.id,
            startRow: Math.max(visibleStartRow, region.startRow) - visibleStartRow,
            endRow: Math.min(visibleEndRow, region.endRow) - visibleStartRow
        }))
        .filter(region => region.endRow > region.startRow);
}

function collectTerminalSectionCursorTargets(
    sections: TerminalPrimaryScreenSection[],
    startRow: number,
    visibleStartRow: number,
    visibleEndRow: number
): TerminalCursorTarget[] {
    const targets: TerminalCursorTarget[] = [];
    let offset = startRow;
    sections.forEach(section => {
        (section.cursorTargets || []).forEach(target => {
            const row = offset + target.row;
            if (row >= visibleStartRow && row < visibleEndRow) {
                targets.push({
                    row: row - visibleStartRow,
                    column: target.column
                });
            }
        });
        offset += section.lines.length;
    });
    return targets;
}

export function composePrimaryTerminalScreen(options: TerminalPrimaryScreenOptions): TerminalPrimaryScreenLayout {
    const legacyTopSection = createTerminalScreenSection('top', options.topLines || []);
    const topSections = normalizeTerminalScreenSections(
        options.topSections || (legacyTopSection ? [legacyTopSection] : [])
    );
    const topLines = flattenTerminalScreenSections(topSections);
    const transcriptBlocks = options.transcriptBlocks || [];
    const footerSections = normalizeTerminalScreenSections(options.footerSections || []);
    const footerLines = flattenTerminalScreenSections(footerSections);
    const height = typeof options.height === 'number' && Number.isFinite(options.height)
        ? Math.max(1, Math.floor(options.height))
        : undefined;
    const transcriptLines = transcriptBlocks.flatMap(block => block);
    let visibleTopLines = topLines.slice();
    const rawLines = [
        ...topLines,
        ...transcriptLines,
        ...footerLines
    ];
    let visibleTranscriptLines = transcriptLines;
    let visibleFooterLines = footerLines.slice();
    let transcriptTotalRows = transcriptLines.length;
    let transcriptMaxScrollOffset = 0;

    if (height !== undefined && rawLines.length > height && transcriptLines.length > 0) {
        const tailRows = footerLines.length;
        const availableTopAndTranscriptRows = Math.max(0, height - tailRows);
        const reservedTranscriptRows = Math.min(
            Math.max(0, options.minContextRows || 0),
            availableTopAndTranscriptRows,
            transcriptLines.length
        );
        visibleTopLines = topLines.slice(0, Math.max(0, availableTopAndTranscriptRows - reservedTranscriptRows));
        const availableTranscriptRows = Math.max(0, availableTopAndTranscriptRows - visibleTopLines.length);
        const window = options.scrollOffset && options.scrollOffset > 0
            ? windowTerminalLinesFromBottom(transcriptLines, availableTranscriptRows, options.scrollOffset)
            : typeof options.anchorBlockIndex === 'number' && options.anchorBlockIndex >= 0
                ? windowTerminalBlocksAroundAnchor(transcriptBlocks, availableTranscriptRows, options.anchorBlockIndex)
                : windowTerminalBlocksFromBottomWithContext(transcriptBlocks, availableTranscriptRows, options.minContextRows || 0);
        visibleTranscriptLines = window.lines;
        transcriptTotalRows = window.totalRows;
        transcriptMaxScrollOffset = Math.max(0, window.totalRows - window.lines.length);
        if ((options.scrollOffset || 0) === 0 && window.startRow > 0 && options.overflowLine) {
            visibleFooterLines = [options.overflowLine, ...visibleFooterLines];
        }
    }

    const composedLines = [
        ...visibleTopLines,
        ...visibleTranscriptLines,
        ...visibleFooterLines
    ];
    const visibleStartRow = height === undefined ? 0 : Math.max(0, composedLines.length - height);
    const visibleEndRow = composedLines.length;
    const lines = height === undefined ? composedLines : composedLines.slice(-height);
    const transcriptStartRow = visibleTopLines.length;
    const footerStartRow = transcriptStartRow + visibleTranscriptLines.length;
    const regions = [
        ...collectTerminalSectionRegions(topSections, 0, visibleStartRow, visibleEndRow),
        {
            id: 'transcript',
            startRow: transcriptStartRow,
            endRow: footerStartRow
        },
        ...collectTerminalSectionRegions(footerSections, footerStartRow, visibleStartRow, visibleEndRow)
    ]
        .map(region => region.id === 'transcript'
            ? {
                id: region.id,
                startRow: Math.max(visibleStartRow, region.startRow) - visibleStartRow,
                endRow: Math.min(visibleEndRow, region.endRow) - visibleStartRow
            }
            : region)
        .filter(region => region.endRow > region.startRow);
    const cursorTargets = [
        ...collectTerminalSectionCursorTargets(topSections, 0, visibleStartRow, visibleEndRow),
        ...collectTerminalSectionCursorTargets(footerSections, footerStartRow, visibleStartRow, visibleEndRow)
    ];
    const legacyInputRegion = regions.find(region => region.id === 'input');
    return {
        lines,
        regions,
        cursorTargets,
        visibleTranscriptLines,
        visibleBottomLines: visibleFooterLines,
        inputStartRow: legacyInputRegion?.startRow ?? footerStartRow - visibleStartRow,
        transcriptStartRow: Math.max(0, transcriptStartRow - visibleStartRow),
        transcriptVisibleRows: visibleTranscriptLines.length,
        transcriptTotalRows,
        transcriptMaxScrollOffset
    };
}

export function createTerminalPrimaryRenderState(): TerminalPrimaryRenderState {
    return {
        renderKey: '',
        paintedLines: [],
        paintedWidth: 0,
        stablePrefixRows: 0,
        cursorRow: 0,
        cursorTarget: undefined,
        terminalRow: 0,
        cursorMode: 'bottom',
        regions: []
    };
}

export function renderPrimaryTerminalScreen(options: TerminalPrimaryRenderOptions): TerminalPrimaryRenderResult {
    const previous = options.state || createTerminalPrimaryRenderState();
    const width = Math.max(1, Math.floor(options.width || 1));
    const fittedLines = (options.lines || []).map(line => fitAnsiLine(String(line || ''), width));
    const cursorMode = options.cursorMode || 'prompt';
    const cursorTarget = options.cursorTarget
        ? {
            row: Math.max(0, Math.floor(options.cursorTarget.row || 0)),
            column: Math.max(0, Math.floor(options.cursorTarget.column || 0))
        }
        : undefined;
    const cursorRow = Math.max(0, Math.min(
        Math.floor(options.cursorRow ?? Math.max(0, fittedLines.length - 1)),
        Math.max(0, fittedLines.length - 1)
    ));
    const stablePrefixRows = Math.max(0, Math.min(
        Math.floor(options.stablePrefixRows || 0),
        fittedLines.length
    ));
    const nextRenderKey = `inline:${width}:${fittedLines.join('\n')}`;
    const placeCursor = (output: string, terminalRow: number): { output: string; terminalRow: number } => {
        if (!options.placeCursor || !cursorTarget || cursorMode !== 'prompt') {
            return { output, terminalRow };
        }
        const target = {
            row: Math.max(0, Math.min(cursorTarget.row, Math.max(0, fittedLines.length - 1))),
            column: cursorTarget.column
        };
        return {
            output: `${output}${buildTerminalCursorSequence({
                target,
                width,
                currentRow: terminalRow,
                mode: 'relative'
            })}`,
            terminalRow: target.row
        };
    };
    const createNextState = (terminalRow: number): TerminalPrimaryRenderState => ({
        renderKey: nextRenderKey,
        paintedLines: fittedLines.slice(),
        paintedWidth: width,
        stablePrefixRows,
        cursorRow,
        cursorTarget,
        terminalRow,
        cursorMode,
        regions: options.regions || []
    });
    if (nextRenderKey === previous.renderKey) {
        const placed = placeCursor('', previous.terminalRow ?? previous.cursorRow);
        return {
            output: placed.output,
            fittedLines,
            cursorRow,
            terminalRow: placed.terminalRow,
            changed: false,
            state: createNextState(placed.terminalRow)
        };
    }

    if (previous.renderKey.startsWith('inline:')
        && width === previous.paintedWidth
        && previous.paintedLines.length === fittedLines.length) {
        const commands: string[] = ['\r'];
        let terminalRow = previous.terminalRow ?? previous.cursorRow;
        fittedLines.forEach((line, index) => {
            if (previous.paintedLines[index] === line) {
                return;
            }
            const delta = index - terminalRow;
            if (delta < 0) {
                commands.push(`\x1b[${Math.abs(delta)}A`);
            } else if (delta > 0) {
                commands.push(`\x1b[${delta}B`);
            }
            commands.push(`\r${line}\x1b[K`);
            terminalRow = index;
        });
        const placed = placeCursor(commands.join(''), terminalRow);
        return {
            output: placed.output,
            fittedLines,
            cursorRow,
            terminalRow: placed.terminalRow,
            changed: true,
            state: createNextState(placed.terminalRow)
        };
    }

    const previousStablePrefixRows = Math.max(0, Math.min(
        previous.stablePrefixRows,
        previous.paintedLines.length
    ));
    const stablePrefixExtendsPrevious = previous.renderKey.startsWith('inline:')
        && width === previous.paintedWidth
        && previous.cursorMode === 'prompt'
        && stablePrefixRows >= previousStablePrefixRows
        && previous.paintedLines.slice(0, previousStablePrefixRows).every((line, index) => line === fittedLines[index]);

    let output = '';
    let terminalRow = fittedLines.length ? fittedLines.length - 1 : 0;
    if (stablePrefixExtendsPrevious && previousStablePrefixRows < previous.paintedLines.length) {
        const commands: string[] = ['\r'];
        const previousTerminalRow = previous.terminalRow ?? previous.cursorRow;
        const linesUp = Math.max(0, previousTerminalRow - previousStablePrefixRows);
        if (linesUp > 0) {
            commands.push(`\x1b[${linesUp}A`);
        }
        commands.push('\x1b[J');
        const appendedLines = fittedLines.slice(previousStablePrefixRows);
        output = `${commands.join('')}${appendedLines.length ? appendedLines.join('\n') : ''}`;
        terminalRow = previousStablePrefixRows + Math.max(0, appendedLines.length - 1);
    } else if (previous.renderKey.startsWith('inline:')
        && width === previous.paintedWidth
        && fittedLines.length > previous.paintedLines.length
        && previous.paintedLines.every((line, index) => line === fittedLines[index])) {
        const previousTerminalRow = Math.max(0, Math.min(
            previous.terminalRow ?? previous.cursorRow,
            Math.max(0, previous.paintedLines.length - 1)
        ));
        const linesDown = Math.max(0, previous.paintedLines.length - 1 - previousTerminalRow);
        const appendedLines = fittedLines.slice(previous.paintedLines.length);
        output = [
            '\r',
            linesDown > 0 ? `\x1b[${linesDown}B` : '',
            appendedLines.length ? `\n${appendedLines.join('\n')}` : ''
        ].join('');
        terminalRow = fittedLines.length ? fittedLines.length - 1 : 0;
    } else {
        const previousAnchorRow = Math.max(0, Math.min(
            previous.terminalRow ?? previous.cursorRow,
            Math.max(0, previous.paintedLines.length - 1)
        ));
        const commands: string[] = [];
        if (previous.renderKey.startsWith('inline:') && previous.paintedLines.length) {
            commands.push('\r');
            if (previousAnchorRow > 0) {
                commands.push(`\x1b[${previousAnchorRow}A`);
            }
            commands.push('\x1b[J');
        }
        output = `${commands.join('')}${fittedLines.length ? fittedLines.join('\n') : ''}`;
    }

    const placed = placeCursor(output, terminalRow);
    return {
        output: placed.output,
        fittedLines,
        cursorRow,
        terminalRow: placed.terminalRow,
        changed: true,
        state: createNextState(placed.terminalRow)
    };
}

export class TerminalUiController {
    protected currentDraft = '';
    protected draftCursor = 0;
    protected suggestionState: SuggestionState = { items: [], selectedIndex: -1 };
    protected historyEntries: string[] = [];
    protected historyIndex = -1;
    protected historyDraft = '';
    protected activeTextPrompt: { question: string; resolve: (value: string) => void } | null = null;

    constructor(protected options: TerminalUiControllerOptions) {
    }

    get draft(): string {
        return this.currentDraft;
    }

    get cursor(): number {
        return this.draftCursor;
    }

    get suggestions(): SuggestionState {
        return this.suggestionState;
    }

    get promptQuestion(): string {
        return this.activeTextPrompt?.question || '';
    }

    setHistoryEntries(entries: string[]): void {
        this.historyEntries = entries.slice();
        this.historyIndex = -1;
        this.historyDraft = '';
    }

    getHistoryEntries(): string[] {
        return this.historyEntries.slice();
    }

    beginTextPrompt(question: string, resolve: (value: string) => void): void {
        this.activeTextPrompt = { question, resolve };
        this.historyIndex = -1;
        this.historyDraft = '';
        this.suggestionState = { items: [], selectedIndex: -1 };
        this.updateDraft('', 0);
    }

    clearTextPrompt(): void {
        this.activeTextPrompt = null;
        this.updateDraft('', 0);
    }

    updateDraft(nextDraft: string, cursor = nextDraft.length): void {
        this.currentDraft = nextDraft;
        this.draftCursor = Math.max(0, Math.min(cursor, this.currentDraft.length));
        this.options.setDraftDisplay(formatDisplayDraft(this.currentDraft, this.draftCursor));
        const nextItems = resolveInputSuggestions(
            this.currentDraft,
            this.options.getCommands(),
            this.options.getMentionCandidates()
        );
        this.suggestionState = normalizeSuggestionState(nextItems, this.suggestionState.selectedIndex >= 0 ? this.suggestionState.selectedIndex : 0);
    }

    applyChunk(chunk: Buffer | string): void {
        const next = applyTerminalInputChunk(this.currentDraft, this.draftCursor, chunk);
        this.updateDraft(next.value, next.cursor);
    }

    hasInteractiveSuggestions(): boolean {
        const token = getActiveInputToken(this.currentDraft);
        return !!token && (token.startsWith('/') || token.startsWith('@')) && this.suggestionState.items.length > 0;
    }

    applySuggestionValue(value?: string): void {
        if (!value) {
            return;
        }
        const nextInput = applySuggestionToInput(this.currentDraft, value);
        this.suggestionState = { items: [], selectedIndex: -1 };
        this.updateDraft(nextInput, nextInput.length);
        this.options.render();
    }

    pushHistoryEntry(value: string): void {
        const trimmed = value.trim();
        if (!trimmed) {
            return;
        }
        this.historyEntries = [trimmed, ...this.historyEntries.filter(item => item !== trimmed)].slice(0, 200);
        this.historyIndex = -1;
        this.historyDraft = '';
    }

    protected findHistoryIndex(startIndex: number, step: number): number {
        for (let index = startIndex; index >= 0 && index < this.historyEntries.length; index += step) {
            if (!shouldSkipConsoleHistoryEntry(this.historyEntries[index])) {
                return index;
            }
        }
        return -1;
    }

    navigateHistory(delta: number): void {
        if (!this.historyEntries.length) {
            return;
        }
        if (delta < 0) {
            if (this.historyIndex === -1) {
                this.historyDraft = this.currentDraft;
            }
            const nextIndex = this.findHistoryIndex(this.historyIndex + 1, 1);
            if (nextIndex < 0) {
                return;
            }
            this.historyIndex = nextIndex;
        } else {
            if (this.historyIndex === -1) {
                return;
            }
            const nextIndex = this.findHistoryIndex(this.historyIndex - 1, -1);
            if (nextIndex < 0) {
                this.historyIndex = -1;
                this.updateDraft(this.historyDraft, this.historyDraft.length);
                this.options.render();
                return;
            }
            this.historyIndex = nextIndex;
        }
        const next = this.historyEntries[this.historyIndex] || '';
        this.updateDraft(next, next.length);
        this.options.render();
    }

    resolveTextPrompt(): boolean {
        const prompt = this.activeTextPrompt;
        if (!prompt) {
            return false;
        }
        this.activeTextPrompt = null;
        prompt.resolve(this.currentDraft);
        this.options.render();
        return true;
    }

    async submitCurrentDraft(): Promise<void> {
        const line = this.currentDraft;
        this.historyIndex = -1;
        this.historyDraft = '';
        this.suggestionState = { items: [], selectedIndex: -1 };
        this.updateDraft('', 0);
        await this.options.submit(line);
    }

    scheduleRender(): void {
        if (this.options.isClosed() || this.options.isSelecting() || this.options.isInputLocked()) {
            return;
        }
        Promise.resolve().then(() => {
            if (this.options.isClosed() || this.options.isSelecting() || this.options.isInputLocked()) {
                return;
            }
            this.options.render();
        });
    }

    async handleKeypress(str: string, key: TerminalKeyPress): Promise<boolean> {
        if (this.options.isClosed()) {
            return true;
        }
        const menu = this.options.menu?.getMenu();
        if (menu && handleTerminalMenuKey(this.options.menu, key?.name || '', str, { render: this.options.render })) {
            return true;
        }
        if (menu && !isSuggestionMenu(menu)) {
            return true;
        }
        if (this.activeTextPrompt && key?.name === 'return') {
            this.resolveTextPrompt();
            return true;
        }
        if (!this.options.isModalPromptActive() && !this.options.isInputLocked() && !this.hasInteractiveSuggestions() && key?.name === 'up') {
            this.navigateHistory(-1);
            return true;
        }
        if (!this.options.isModalPromptActive() && !this.options.isInputLocked() && !this.hasInteractiveSuggestions() && key?.name === 'down') {
            this.navigateHistory(1);
            return true;
        }
        if (this.options.isModalPromptActive() || this.options.isInputLocked() || !this.hasInteractiveSuggestions()) {
            if (!this.options.isModalPromptActive() && !this.options.isInputLocked() && key?.name === 'return') {
                await this.submitCurrentDraft();
                return true;
            }
            const isEditableKey = key?.name === 'backspace'
                || key?.name === 'delete'
                || key?.name === 'left'
                || key?.name === 'right'
                || key?.name === 'home'
                || key?.name === 'end'
                || (!!str && !key?.ctrl && !key?.meta && key?.name !== 'return' && key?.name !== 'tab');
            if (isEditableKey) {
                this.scheduleRender();
                return true;
            }
            return false;
        }
        if (key?.name === 'down') {
            this.suggestionState = moveSuggestionSelection(this.suggestionState, 1);
            this.options.render();
            return true;
        }
        if (key?.name === 'up') {
            this.suggestionState = moveSuggestionSelection(this.suggestionState, -1);
            this.options.render();
            return true;
        }
        if (key?.name === 'return' && shouldAcceptSuggestionOnEnter(this.currentDraft, this.suggestionState)) {
            const selected = this.suggestionState.items[this.suggestionState.selectedIndex];
            this.applySuggestionValue(selected?.value);
            return true;
        }
        if (key?.name === 'return') {
            await this.submitCurrentDraft();
            return true;
        }
        if (key?.name === 'tab' && this.suggestionState.selectedIndex >= 0) {
            const selected = this.suggestionState.items[this.suggestionState.selectedIndex];
            this.applySuggestionValue(selected?.value);
            return true;
        }
        const isEditableKey = key?.name === 'backspace'
            || key?.name === 'delete'
            || key?.name === 'left'
            || key?.name === 'right'
            || key?.name === 'home'
            || key?.name === 'end'
            || (!!str && !key?.ctrl && !key?.meta && key?.name !== 'return' && key?.name !== 'tab');
        if (isEditableKey) {
            this.scheduleRender();
            return true;
        }
        return false;
    }
}

export function formatDisplayDraft(value: string, cursor: number): string {
    void cursor;
    return value;
}

export function isSuggestionMenu(menu?: TerminalMenuStateLike | null): boolean {
    return menu?.title === 'Suggestions';
}

export function buildSuggestionMenuOptions(state: SuggestionState): SelectMenuOption[] {
    return state.items.map(item => ({
        label: item.label,
        value: item.value
    }));
}

export function renderSelectMenu(title: string, options: SelectMenuOption[], selectedIndex: number, hint = '1-9 select   up/down move   enter confirm   q cancel'): string[] {
    const labelColumnWidth = resolveConsoleOptionLabelColumnWidth(options, 0);
    return [
        ...String(title || '').split('\n'),
        '',
        ...options.map((option, index) => formatConsoleSelectOptionTableRow(
            index,
            option.label,
            index === selectedIndex,
            option.description || '',
            labelColumnWidth
        )),
        '',
        hint
    ];
}

export function resolveSelectMenuOptionIndexFromRow(row: number, title: string, optionCount: number, startRow = 1): number {
    const titleLines = Math.max(1, String(title || '').split('\n').length);
    const firstOptionRow = startRow + titleLines + 2;
    const index = row - firstOptionRow;
    if (index < 0 || index >= optionCount) {
        return -1;
    }
    return index;
}

export function findSelectMenuOptionIndexFromRenderedLines(
    renderedLines: string[],
    title: string,
    optionCount: number,
    row: number
): number {
    if (!renderedLines.length || optionCount <= 0 || row < 1 || row > renderedLines.length) {
        return -1;
    }
    const normalized = renderedLines.map(line => line.replace(/\x1b\[[0-9;]*m/g, ''));
    const titleLines = String(title || '').split('\n').filter(line => line.length > 0);
    const firstTitle = titleLines[0] || '';
    const titleStart = firstTitle ? normalized.findIndex(line => line.includes(firstTitle)) : -1;
    if (titleStart < 0) {
        return -1;
    }
    const optionPattern = /(?:^|\s|\u2502)[›>]?\s*\d+\.\s/;
    const optionRows: number[] = [];
    for (let index = titleStart + Math.max(1, titleLines.length); index < normalized.length; index++) {
        if (optionPattern.test(normalized[index])) {
            optionRows.push(index + 1);
        }
    }
    if (!optionRows.length) {
        return -1;
    }
    const index = optionRows.indexOf(row);
    if (index < 0 || index >= optionCount) {
        return -1;
    }
    return index;
}

export function parseTerminalMouseEvent(input: Buffer | string): SelectMenuMouseEvent | undefined {
    const text = Buffer.isBuffer(input) ? input.toString('utf8') : input;
    const match = text.match(/\x1b\[<(\d+);(\d+);(\d+)([mM])/);
    if (!match) {
        return undefined;
    }
    return {
        button: parseInt(match[1], 10),
        x: parseInt(match[2], 10),
        y: parseInt(match[3], 10),
        release: match[4] === 'm'
    };
}

export function formatClockTime(value?: number): string {
    if (!value || !Number.isFinite(value)) {
        return '--:--:--';
    }
    const date = new Date(value);
    const parts = [date.getHours(), date.getMinutes(), date.getSeconds()]
        .map(part => String(part).padStart(2, '0'));
    return parts.join(':');
}

export function renderToolRunLine(run: TerminalToolRunItem): string {
    const icon = run.status === 'running'
        ? '[run]'
        : run.status === 'success'
            ? '[ok ]'
            : '[err]';
    const duration = run.durationMs != null ? ` ${run.durationMs}ms` : '';
    return `${formatClockTime(run.updatedAt)} ${icon} ${run.name}${duration} ${run.message}`.trim();
}

export function renderActivityLine(activity: TerminalActivityItem): string {
    return `${formatClockTime(activity.createdAt)} [${activity.kind}] ${activity.message}`;
}

export function sortToolRuns(runs: TerminalToolRunItem[]): TerminalToolRunItem[] {
    const rank = (status: TerminalToolRunItem['status']) => {
        switch (status) {
            case 'running':
                return 0;
            case 'error':
                return 1;
            case 'success':
            default:
                return 2;
        }
    };
    return runs.slice().sort((left, right) => {
        const statusDiff = rank(left.status) - rank(right.status);
        if (statusDiff !== 0) {
            return statusDiff;
        }
        return (right.updatedAt || 0) - (left.updatedAt || 0);
    });
}

export function getActiveInputToken(input: string): string {
    const match = input.match(/(^|\s)([\/@][^\s]*)$/);
    return match?.[2] || '';
}

export function buildMentionCandidates(toolNames: string[] = []): string[] {
    const mentions = ['@workspace', '@model', '@tools', '@session'];
    toolNames.forEach(name => mentions.push(`@${name}`));
    return Array.from(new Set(mentions));
}

export function resolveInputSuggestions(input: string, commands: string[] = CHAT_COMMANDS, mentions: string[] = []): SuggestionItem[] {
    const token = getActiveInputToken(input);
    if (!token) {
        return [
            { group: 'Hints', label: 'Type / for commands', value: 'Type / for commands' },
            { group: 'Hints', label: 'Type @ for mentions', value: 'Type @ for mentions' }
        ];
    }
    if (token.startsWith('/')) {
        const matches = commands.filter(item => item.startsWith(token));
        return (matches.length ? matches : commands).map(item => ({
            group: 'Commands' as const,
            label: item,
            value: item
        }));
    }
    if (token.startsWith('@')) {
        const matches = mentions.filter(item => item.startsWith(token));
        return (matches.length ? matches : mentions).map(item => ({
            group: 'Mentions' as const,
            label: item,
            value: item
        }));
    }
    return [];
}

export function extractMentions(input: string): string[] {
    const matches = input.match(/(^|\s)@([a-zA-Z0-9_.-]+)/g) || [];
    return Array.from(new Set(matches.map(item => item.trim())));
}

export function buildMentionContextLines(mentions: string[], options: MentionContextOptions): string[] {
    const lines: string[] = [];
    const toolMap = new Map((options.tools || []).map(tool => [tool.name, tool]));
    mentions.forEach(mention => {
        const name = mention.slice(1);
        switch (name) {
            case 'workspace':
                lines.push(`Workspace: ${options.workspace}`);
                break;
            case 'session':
                lines.push(`Session: ${options.sessionId}`);
                break;
            case 'model':
                lines.push(`Model: ${options.provider} / ${options.model}`);
                break;
            case 'tools':
                lines.push(`Tools: ${(options.tools || []).map(tool => tool.name).join(', ') || '(none)'}`);
                break;
            default: {
                const tool = toolMap.get(name);
                if (tool) {
                    lines.push(`Tool ${tool.name}: toolset=${tool.toolset || 'default'}, active=${tool.active === false ? 'no' : 'yes'}`);
                }
                break;
            }
        }
    });
    return lines;
}

export function enrichPromptWithMentions(input: string, options: MentionContextOptions): string {
    const mentions = extractMentions(input);
    if (!mentions.length) {
        return input;
    }
    const contextLines = buildMentionContextLines(mentions, options);
    if (!contextLines.length) {
        return input;
    }
    return [
        '[Mention Context]',
        ...contextLines,
        '',
        input
    ].join('\n');
}

export function normalizeSuggestionState(items: SuggestionItem[], selectedIndex = 0): SuggestionState {
    if (!items.length) {
        return { items: [], selectedIndex: -1 };
    }
    const nextIndex = Math.max(0, Math.min(items.length - 1, selectedIndex));
    return { items, selectedIndex: nextIndex };
}

export function moveSuggestionSelection(state: SuggestionState, delta: number): SuggestionState {
    if (!state.items.length) {
        return { items: [], selectedIndex: -1 };
    }
    const next = (state.selectedIndex + delta + state.items.length) % state.items.length;
    return { items: state.items, selectedIndex: next };
}

export function applySuggestionToInput(input: string, suggestion: string): string {
    const token = getActiveInputToken(input);
    if (!token) {
        return input;
    }
    return `${input.slice(0, input.length - token.length)}${suggestion} `;
}

export function shouldAcceptSuggestionOnEnter(input: string, state: SuggestionState): boolean {
    if (state.selectedIndex < 0 || state.selectedIndex >= state.items.length) {
        return false;
    }
    const token = getActiveInputToken(input);
    if (!token) {
        return false;
    }
    if (token.startsWith('/')) {
        return false;
    }
    const suggestion = state.items[state.selectedIndex]?.value;
    return !!suggestion && suggestion !== token && suggestion.startsWith(token);
}

export function resolveUniqueCommandPrefix(input: string, commands: string[] = CHAT_COMMANDS): string {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) {
        return trimmed;
    }
    const matches = commands.filter(item => item.startsWith(trimmed));
    return matches.length === 1 ? matches[0] : trimmed;
}

export function renderDraftLine(line: string): string {
    return line.replace(/(^|\s)(@[\w.-]+)/g, (_match, prefix, mention) => `${prefix}[${mention}]`);
}

export function applyTerminalInputChunk(value: string, cursor: number, chunk: Buffer | string): TerminalDraftState {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
    if (!text || parseTerminalMouseEvent(text)) {
        return { value, cursor };
    }
    return applyConsoleTextInputChunk(value, cursor, text);
}

export function buildTerminalHeaderLine(options: TerminalHeaderOptions): string {
    return fitLine(
        `${options.provider} / ${options.model}  |  ${options.status}  |  ${options.tasksCount} tasks  |  ${options.runningToolsLabel}`,
        options.width
    );
}

export function buildTerminalSubHeaderLine(options: TerminalSubHeaderOptions): string {
    return fitLine(
        `session ${options.sessionId}  |  ${options.workspace}`,
        options.width
    );
}

export function buildConversationLines(options: TerminalConversationOptions): string[] {
    const renderedLines = options.renderedLines || [];
    if (renderedLines.length) {
        return renderedLines
            .flatMap((line: string) => [line, ''])
            .slice(-options.maxLines);
    }
    const messages = options.messages || [];
    return messages
        .slice(-8)
        .flatMap((message: any) => renderConversationMessage(message.role, message.content, options.width))
        .slice(-options.maxLines);
}

export function renderMessagePreview(role: string, content: string, width = 160): string[] {
    const normalized = String(content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trimEnd());
    if (!normalized.length) {
        return [`${role}> `];
    }
    const lines: string[] = [];
    normalized.forEach((line, index) => {
        const prefix = index === 0 ? `${role}> ` : '... ';
        const value = line || '';
        if (!value) {
            lines.push(prefix);
            return;
        }
        let rest = value;
        const chunkWidth = Math.max(24, width - prefix.length);
        while (rest.length > chunkWidth) {
            lines.push(`${prefix}${rest.slice(0, chunkWidth)}`);
            rest = rest.slice(chunkWidth);
        }
        lines.push(`${prefix}${rest}`);
    });
    return lines;
}

export function renderConversationMessage(role: string, content: string, width = 160): string[] {
    const normalized = String(content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trimEnd());
    const label = role === 'user'
        ? 'you'
        : role === 'assistant'
            ? 'agent'
            : (role || 'system').toLowerCase();
    const firstPrefix = `${label}> `;
    const nextPrefix = '... ';
    if (!normalized.length) {
        return [firstPrefix];
    }
    const lines: string[] = [];
    normalized.forEach((line, index) => {
        const prefix = index === 0 ? firstPrefix : nextPrefix;
        const value = line || '';
        if (!value) {
            lines.push(prefix);
            return;
        }
        let rest = value;
        const chunkWidth = Math.max(24, width - prefix.length);
        while (rest.length > chunkWidth) {
            lines.push(`${prefix}${rest.slice(0, chunkWidth)}`);
            rest = rest.slice(chunkWidth);
        }
        lines.push(`${prefix}${rest}`);
    });
    return [...lines, ''];
}

export function renderToolDetail(run?: TerminalToolRunItem & Record<string, any>): string[] {
    if (!run) {
        return ['(none)'];
    }
    const lines = [
        `Name: ${run.name}`,
        `Status: ${run.status}`,
        `Updated: ${formatClockTime(run.updatedAt)}`
    ];
    if (run.executionMode) {
        lines.push(`Mode: ${run.executionMode}`);
    }
    if (run.attemptCount != null) {
        lines.push(`Attempts: ${run.attemptCount}`);
    }
    if (run.durationMs != null) {
        lines.push(`Duration: ${run.durationMs}ms`);
    }
    if (run.toolCallId) {
        lines.push(`Tool Call: ${run.toolCallId}`);
    }
    if (run.inputSummary) {
        lines.push(`Input: ${run.inputSummary}`);
    }
    if (run.outputSummary) {
        lines.push(`Output: ${run.outputSummary}`);
    }
    if (run.error) {
        lines.push(`Error: ${run.error}`);
    }
    if (run.message && run.message !== 'Running') {
        lines.push(`Note: ${run.message}`);
    }
    return lines;
}

export function fitLine(line: string, width: number): string {
    if (line.length <= width) {
        return line;
    }
    if (width <= 3) {
        return line.slice(0, width);
    }
    return `${line.slice(0, width - 3)}...`;
}

export function formatSection(title: string, lines: string[], width: number, maxLines: number): string[] {
    const innerWidth = Math.max(24, width);
    const visible = (lines.length ? lines : ['(empty)']).slice(-maxLines);
    const header = `[ ${title} ]`;
    return [
        fitLine(header, innerWidth),
        ...visible.map(line => `  ${fitLine(line, Math.max(16, innerWidth - 2))}`)
    ];
}

export interface TerminalPanelRenderOptions {
    footerLines?: string[];
}

export function renderPanel(
    title: string,
    lines: string[],
    width: number,
    height?: number,
    options: TerminalPanelRenderOptions = {}
): string[] {
    const panelWidth = Math.max(24, width);
    const maxHeight = typeof height === 'number' && Number.isFinite(height)
        ? Math.max(1, Math.floor(height))
        : undefined;
    const footer = (options.footerLines || [])
        .map(line => fitLine(line, panelWidth));
    const bodyHeight = maxHeight === undefined
        ? undefined
        : Math.max(0, maxHeight - 1 - footer.length);
    const source = lines.length ? lines : [''];
    const visible = bodyHeight === undefined
        ? source
        : bodyHeight > 0 ? source.slice(-bodyHeight) : [];
    const header = fitLine(`${title}`, panelWidth);
    const body = visible.map(line => `  ${fitLine(line, Math.max(16, panelWidth - 2))}`);
    return [header, ...body, ...footer];
}

function trimEdgeBlanks(lines: string[]): string[] {
    const next = lines.slice();
    while (next.length && !String(next[0] || '').trim()) {
        next.shift();
    }
    while (next.length && !String(next[next.length - 1] || '').trim()) {
        next.pop();
    }
    return next;
}

export function composeTerminalChatScreen(options: TerminalChatScreenOptions): TerminalChatScreenLayout {
    const lines: string[] = [
        options.appTitle || 'tsdi-agent',
        options.headerLine,
        options.subHeaderLine
    ];
    const conversationLines = trimEdgeBlanks(options.conversationLines || []);
    const contextLines = trimEdgeBlanks([
        ...(options.promptQuestion ? [
            `prompt  ${options.promptQuestion}`,
            'prompt  Enter confirm   /quit exit'
        ] : []),
        ...(options.notice ? [`notice  ${options.notice}`] : []),
        ...(options.latestActivity ? [`activity  ${options.latestActivity}`] : []),
        ...(options.latestToolRun ? [`tool  ${options.latestToolRun}`] : []),
        ...(options.focusedTool ? [`focus  ${options.focusedTool}`] : []),
        ...(options.toolsSummary ? [`tools  ${options.toolsSummary}`] : [])
    ]);

    if (conversationLines.length) {
        lines.push('', ...conversationLines);
    }
    if (contextLines.length) {
        lines.push('', ...contextLines);
    }
    if ((options.workingLines || []).length) {
        lines.push('', ...trimEdgeBlanks(options.workingLines || []));
    }
    if ((options.inputLines || []).length) {
        lines.push('', ...trimEdgeBlanks(options.inputLines || []));
    }

    let selectMenuScreenRow = -1;
    if ((options.selectLines || []).length) {
        selectMenuScreenRow = lines.length + 2;
        lines.push('', ...trimEdgeBlanks(options.selectLines || []));
    }

    if ((options.statusLines || []).length) {
        lines.push('', ...trimEdgeBlanks(options.statusLines || []));
    }

    return {
        lines,
        contextLines,
        selectMenuScreenRow
    };
}
