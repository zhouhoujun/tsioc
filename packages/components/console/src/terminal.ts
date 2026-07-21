import {
    applyConsoleTextInputChunk,
    formatConsoleIndexedOptionLabel,
    formatConsoleSelectOptionTableRow,
    resolveConsoleOptionLabelColumnWidth,
    shouldSkipConsoleHistoryEntry
} from './input';
import { Runner, Shutdown } from '@tsdi/core';
import { Abstract, Inject, Injectable, Injector, Optional, Provider, token } from '@tsdi/ioc';
import { getDisplayWidth, sliceByDisplayWidth } from './display-width';
import { RNode, Renderer } from '@tsdi/components';
import { ConsoleNode } from './console';

const CHAT_COMMANDS = ['/help', '/tools', '/model', '/clear', '/multiline', '/send', '/cancel', '/sessions', '/messages', '/session', '/new', '/approvals', '/approve', '/deny', '/copy', '/quit', '/exit'];

const TERMINAL_RENDER_ANSI = {
    reset: '\x1b[0m',
    dim: '\x1b[38;2;110;118;129m',
    blue: '\x1b[38;2;121;192;255m',
    blueStrong: '\x1b[1m\x1b[38;2;143;208;255m',
    green: '\x1b[1m\x1b[38;2;126;231;135m',
    amber: '\x1b[38;2;255;184;107m',
    bgSelected: '\x1b[48;2;19;32;43m'
} as const;

const JS_LIKE_TERMINAL_KEYWORDS = new Set([
    'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default',
    'delete', 'else', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function',
    'if', 'import', 'in', 'interface', 'let', 'new', 'null', 'return', 'static', 'switch',
    'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'var', 'while', 'yield'
]);

const SHELL_TERMINAL_KEYWORDS = new Set([
    'case', 'cd', 'do', 'done', 'echo', 'elif', 'else', 'esac', 'export', 'fi', 'for',
    'function', 'git', 'if', 'local', 'node', 'npm', 'pnpm', 'return', 'then', 'while', 'yarn'
]);

export const DEFAULT_TERMINAL_APP_TITLE = 'TSDI Agent';
export const DEFAULT_TERMINAL_COLUMNS = 100;
export const DEFAULT_TERMINAL_ROWS = 24;
export const MIN_TERMINAL_COLUMNS = 24;
export const MIN_TERMINAL_ROWS = 16;
export const MIN_TERMINAL_CONTENT_WIDTH = 8;
export const DEFAULT_CONSOLE_SELECT_VISIBLE_OPTIONS = 12;
export const DEFAULT_CONSOLE_SELECT_DETAIL_VISIBLE_LINES = 6;
export const DEFAULT_CONSOLE_SELECT_HINT = '1-9 select   up/down move   enter confirm   q cancel';
export const DEFAULT_CONSOLE_SELECT_CLOSE_HINT = 'up/down move   enter close   q close';

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

export interface TuiTerminalSurfaceRenderer {
    renderToTuiLayout(node: RNode | RNode[], options?: { width?: number }): {
        lines: string[];
        cursorTargets?: TerminalCursorTarget[];
        regions?: TerminalRenderRegion[];
    };
}

export interface TuiTerminalSurfaceOptions {
    renderer: TuiTerminalSurfaceRenderer;
    output?: { write(value: string): void; on?(event: string, listener: () => void): void; off?(event: string, listener: () => void): void };
    root?: RNode | RNode[];
    width?: number | (() => number);
    placeCursor?: boolean | (() => boolean);
    cursorMode?: 'prompt' | 'bottom' | (() => 'prompt' | 'bottom');
    stablePrefixRows?: number | ((lines: string[]) => number);
    stableRegionId?: string | string[];
    scheduler?: (task: () => void) => void;
}

export interface ConsoleTerminalInputLike {
    isTTY?: boolean;
    readable?: boolean;
    on(event: 'data', listener: (chunk: Buffer | string) => void): void;
    off?(event: 'data', listener: (chunk: Buffer | string) => void): void;
    removeListener?(event: 'data', listener: (chunk: Buffer | string) => void): void;
    read?(): Buffer | string | null;
    resume?(): void;
    pause?(): void;
    setRawMode?(enabled: boolean): void;
}

export interface ConsoleTerminalInputControllerOptions {
    input?: ConsoleTerminalInputLike;
    decoder?: TerminalInputSequenceDecoder;
    pollIntervalMs?: number;
    onChunk: (
        decoded: TerminalInputSequenceResult,
        chunk: Buffer | string
    ) => void | Promise<void>;
}

@Abstract()
export abstract class ConsoleTerminalInputLifecycle {
    abstract start(): void;
    abstract stop(): void;
}

@Abstract()
export abstract class ConsoleTerminalInputHandler {
    abstract handleTerminalInput(
        decoded: TerminalInputSequenceResult,
        chunk: Buffer | string
    ): void | Promise<void>;
}

@Abstract()
export abstract class ConsoleTerminalSurfaceLifecycle {
    abstract getTerminalRoot(): RNode | RNode[] | undefined;
    shouldPlaceTerminalCursor?(): boolean;
    resolveTerminalCursorMode?(): 'prompt' | 'bottom';
}

@Abstract()
export abstract class ConsoleTerminalSurfaceAccessor {
    abstract getLastRenderedLines(): string[];
    abstract getLastRenderedText(stripAnsi: (value: string) => string): string;
}

export class ConsoleTerminalInputController {
    protected readonly input: ConsoleTerminalInputLike;
    protected readonly decoder: TerminalInputSequenceDecoder;
    protected readonly pollIntervalMs: number;
    protected started = false;
    protected resumed = false;
    protected dataHandler?: (chunk: Buffer | string) => void;
    protected pollTimer?: NodeJS.Timeout;

    constructor(protected options: ConsoleTerminalInputControllerOptions) {
        this.input = options.input || (globalThis as any).process?.stdin;
        this.decoder = options.decoder || new TerminalInputSequenceDecoder();
        this.pollIntervalMs = Math.max(10, Math.floor(options.pollIntervalMs || 20));
    }

    start(): void {
        if (this.started || !this.input?.on) {
            return;
        }
        this.started = true;
        this.dataHandler = (chunk: Buffer | string) => {
            void this.options.onChunk(this.decoder.decode(chunk), chunk);
        };
        this.input.on('data', this.dataHandler);
        this.input.setRawMode?.(true);
        this.input.resume?.();
        this.resumed = true;
        if (this.input.read) {
            this.pollTimer = setInterval(() => {
                if (!this.started || this.input.readable === false) {
                    return;
                }
                while (true) {
                    const chunk = this.input.read?.();
                    if (chunk == null) {
                        break;
                    }
                    this.dataHandler?.(chunk);
                }
            }, this.pollIntervalMs);
            this.pollTimer.unref?.();
        }
    }

    stop(): void {
        if (!this.started) {
            return;
        }
        this.started = false;
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = undefined;
        }
        if (this.dataHandler) {
            if (this.input.off) {
                this.input.off('data', this.dataHandler);
            } else {
                this.input.removeListener?.('data', this.dataHandler);
            }
            this.dataHandler = undefined;
        }
        this.input.setRawMode?.(false);
        if (this.resumed) {
            this.input.pause?.();
            this.resumed = false;
        }
        this.decoder.reset();
    }
}

@Injectable()
export class ConsoleTerminalInputLifecycleService extends ConsoleTerminalInputLifecycle {
    protected readonly controller: ConsoleTerminalInputController;

    constructor(
        private injector: Injector
    ) {
        super();
        this.controller = new ConsoleTerminalInputController({
            onChunk: (decoded, chunk) => {
                if (this.injector.destroyed) {
                    return;
                }
                return this.injector.get(ConsoleTerminalInputHandler, null)?.handleTerminalInput?.(decoded, chunk);
            }
        });
    }

    start(): void {
        if (!this.injector.get(ConsoleTerminalInputHandler, null)) {
            return;
        }
        this.controller.start();
    }

    stop(): void {
        this.controller.stop();
    }
}

@Injectable()
export class ConsoleTerminalSurfaceLifecycleService extends ConsoleTerminalSurfaceAccessor {
    protected surface: TuiTerminalSurface | null = null;
    protected root?: RNode | RNode[];
    protected readonly output = (globalThis as any).process?.stdout;
    protected readonly useAlternateScreen = shouldUseAlternateScreen();
    protected attachTimer?: NodeJS.Timeout;

    constructor(
        private injector: Injector
    ) {
        super();
    }

    startRendering(): void {
        if (!this.injector.get(ConsoleTerminalSurfaceLifecycle, null)) {
            return;
        }
        this.prepare();
        this.attach();
    }

    stopRendering(): void {
        this.cleanup({
            preserveScreen: true,
            retainedLines: this.surface?.lastRenderedLines || []
        });
    }

    getLastRenderedLines(): string[] {
        return this.surface?.lastRenderedLines || [];
    }

    getLastRenderedText(stripAnsiValue: (value: string) => string): string {
        return this.getLastRenderedLines().map(line => stripAnsiValue(line)).join('\n').trim();
    }

    protected prepare(): void {
        if (!this.output?.isTTY) {
            return;
        }
        if (this.useAlternateScreen) {
            this.output.write('\x1b[?1049h');
        }
        this.output.write(buildClearScreenSequence(false));
    }

    protected attach(): void {
        const lifecycle = this.injector.get(ConsoleTerminalSurfaceLifecycle, null);
        if (!lifecycle) {
            return;
        }
        const root = lifecycle?.getTerminalRoot?.();
        if (!root) {
            this.scheduleAttachRetry();
            return;
        }
        const renderer = this.injector.get(Renderer, null) as TuiTerminalSurfaceRenderer | null;
        if (!renderer || typeof renderer.renderToTuiLayout !== 'function') {
            return;
        }
        this.root = root;
        this.surface?.destroy();
        this.surface = new TuiTerminalSurface({
            renderer,
            root,
            width: () => resolveTerminalSize(this.output || {}).columns,
            output: this.output,
            placeCursor: () => lifecycle?.shouldPlaceTerminalCursor?.() ?? false,
            cursorMode: () => lifecycle?.resolveTerminalCursorMode?.() ?? 'prompt'
        });
        this.surface.render();
    }

    protected cleanup(options: { preserveScreen?: boolean; clearScrollback?: boolean; retainedLines?: string[] } = {}): void {
        if (this.attachTimer) {
            clearTimeout(this.attachTimer);
            this.attachTimer = undefined;
        }
        if (this.output?.isTTY) {
            this.output.write(buildTerminalCleanupSequence({
                reset: '\x1b[0m',
                alternateScreen: this.useAlternateScreen,
                preserveScreen: options.preserveScreen,
                clearScrollback: options.clearScrollback,
                retainedLines: options.retainedLines,
                paintedLineCount: this.surface?.lastRenderedLines.length || 0,
                terminalRows: this.output.rows || 0,
                currentRow: !this.useAlternateScreen && options.preserveScreen
                    ? this.surface?.lastTerminalRow || 0
                    : undefined
            }));
        }
        this.surface?.destroy();
        this.surface = null;
        this.root = undefined;
    }

    protected scheduleAttachRetry(): void {
        if (this.attachTimer) {
            return;
        }
        this.attachTimer = setTimeout(() => {
            this.attachTimer = undefined;
            this.attach();
        }, 10);
        this.attachTimer.unref?.();
    }
}

@Injectable()
export class ConsoleTerminalApplicationLifecycleService {
    constructor(
        private input: ConsoleTerminalInputLifecycleService,
        private surface: ConsoleTerminalSurfaceLifecycleService
    ) {
    }

    @Runner()
    start(): void {
        this.input.start();
        this.surface.startRendering();
    }

    @Shutdown()
    stop(): void {
        this.surface.stopRendering();
        this.input.stop();
    }

    onDestroy(): void {
        this.stop();
    }
}

export function provideConsoleTerminalLifecycle(): Provider[] {
    return [
        ConsoleTerminalInputLifecycleService,
        ConsoleTerminalSurfaceLifecycleService,
        ConsoleTerminalApplicationLifecycleService,
        { provide: ConsoleTerminalSurfaceAccessor, useExisting: ConsoleTerminalSurfaceLifecycleService }
    ];
}

export class TuiTerminalSurface {
    protected root?: RNode | RNode[];
    protected renderState?: TerminalPrimaryRenderState;
    protected scheduled = false;
    protected destroyed = false;
    protected listeners: Array<{ node: ConsoleNode; listener: EventListener }> = [];
    protected outputResizeListener?: () => void;
    protected renderedLines: string[] = [];
    protected terminalRow = 0;

    constructor(protected options: TuiTerminalSurfaceOptions) {
        this.bindOutputResize();
        if (options.root) {
            this.attach(options.root);
        }
    }

    get lastRenderedLines(): string[] {
        return this.renderedLines.slice();
    }

    get lastTerminalRow(): number {
        return this.terminalRow;
    }

    attach(root: RNode | RNode[]): this {
        this.detach();
        this.root = root;
        const nodes = Array.isArray(root) ? root : [root];
        nodes.forEach(node => {
            const consoleNode = node as ConsoleNode;
            if (!consoleNode?.addEventListener) {
                return;
            }
            const listener = (() => this.requestRender()) as EventListener;
            consoleNode.addEventListener(ConsoleNode.CHANGE_EVENT, listener);
            this.listeners.push({ node: consoleNode, listener });
        });
        this.requestRender();
        return this;
    }

    detach(): void {
        this.listeners.forEach(({ node, listener }) => node.removeEventListener(ConsoleNode.CHANGE_EVENT, listener));
        this.listeners = [];
        this.root = undefined;
        this.renderState = undefined;
        this.renderedLines = [];
        this.terminalRow = 0;
        this.scheduled = false;
    }

    requestRender(): void {
        if (this.destroyed || this.scheduled) {
            return;
        }
        this.scheduled = true;
        const run = () => {
            this.scheduled = false;
            this.render();
        };
        if (this.options.scheduler) {
            this.options.scheduler(run);
            return;
        }
        Promise.resolve().then(run);
    }

    render(): TerminalPrimaryRenderResult | undefined {
        if (this.destroyed || !this.root) {
            return undefined;
        }
        const width = this.resolveWidth();
        const layout = this.options.renderer.renderToTuiLayout(this.root, { width });
        const lines = layout.lines || [];
        const cursorTarget = layout.cursorTargets?.[0];
        const cursorMode = this.resolveCursorMode();
        const cursorRow = cursorMode === 'prompt' && cursorTarget
            ? cursorTarget.row
            : Math.max(0, lines.length - 1);
        const result = renderPrimaryTerminalScreen({
            state: this.renderState,
            lines,
            regions: layout.regions,
            width,
            stablePrefixRows: this.resolveStablePrefixRows(lines, layout.regions || []),
            cursorRow,
            cursorTarget: this.resolvePlaceCursor() ? cursorTarget : undefined,
            cursorMode,
            placeCursor: this.resolvePlaceCursor()
        });
        this.renderState = result.state;
        this.renderedLines = result.fittedLines.slice();
        this.terminalRow = result.terminalRow;
        if (result.output) {
            this.resolveOutput()?.write(result.output);
        }
        return result;
    }

    destroy(): void {
        this.destroyed = true;
        this.detach();
        this.unbindOutputResize();
    }

    protected resolveWidth(): number {
        const configured = typeof this.options.width === 'function'
            ? this.options.width()
            : this.options.width;
        return Math.max(1, Math.floor(configured || DEFAULT_TERMINAL_COLUMNS));
    }

    protected resolvePlaceCursor(): boolean {
        return typeof this.options.placeCursor === 'function'
            ? this.options.placeCursor()
            : this.options.placeCursor !== false;
    }

    protected resolveCursorMode(): 'prompt' | 'bottom' {
        const value = typeof this.options.cursorMode === 'function'
            ? this.options.cursorMode()
            : this.options.cursorMode;
        return value || 'prompt';
    }

    protected resolveStablePrefixRows(lines: string[], regions: TerminalRenderRegion[] = []): number {
        const regionIds = this.resolveStableRegionIds();
        if (regionIds.length) {
            const matching = regions
                .filter(region => regionIds.includes(region.id))
                .sort((left, right) => left.startRow - right.startRow)[0];
            if (matching) {
                return Math.max(0, Math.min(matching.startRow, lines.length));
            }
        }
        const configured = typeof this.options.stablePrefixRows === 'function'
            ? this.options.stablePrefixRows(lines)
            : this.options.stablePrefixRows;
        return Math.max(0, Math.min(Math.floor(configured || 0), lines.length));
    }

    protected resolveStableRegionIds(): string[] {
        const configured = this.options.stableRegionId;
        return (Array.isArray(configured) ? configured : [configured])
            .map(value => String(value || '').trim())
            .filter(Boolean);
    }

    protected resolveOutput(): { write(value: string): void; on?(event: string, listener: () => void): void; off?(event: string, listener: () => void): void } | undefined {
        return this.options.output || (globalThis as any).process?.stdout;
    }

    protected bindOutputResize(): void {
        const output = this.resolveOutput();
        if (!output?.on || this.outputResizeListener) {
            return;
        }
        this.outputResizeListener = () => this.requestRender();
        output.on('resize', this.outputResizeListener);
    }

    protected unbindOutputResize(): void {
        const output = this.resolveOutput();
        if (!output?.off || !this.outputResizeListener) {
            this.outputResizeListener = undefined;
            return;
        }
        output.off('resize', this.outputResizeListener);
        this.outputResizeListener = undefined;
    }
}

export interface TerminalRenderedWindow {
    lines: string[];
    startRow: number;
    totalRows: number;
}

export interface TerminalSizeLike {
    columns?: number;
    rows?: number;
}

export interface TerminalSize {
    columns: number;
    rows: number;
}

export interface TerminalBlockRenderOptions {
    width: number;
    frame?: boolean;
    shellCodes?: string[];
    lineCodes?: string[];
    paint?: (value: string, ...codes: string[]) => string;
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
    if (options.blockingMenu) {
        if (keyName === 'escape') {
            return 'escape';
        }
        const rawText = String(text || '');
        if (/^[1-9q]$/.test(rawText)) {
            return rawText;
        }
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

export function resolveTerminalSize(size: TerminalSizeLike = {}): TerminalSize {
    return {
        columns: Math.max(MIN_TERMINAL_COLUMNS, size.columns || DEFAULT_TERMINAL_COLUMNS),
        rows: Math.max(MIN_TERMINAL_ROWS, size.rows || DEFAULT_TERMINAL_ROWS)
    };
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

function padTerminalDisplayText(value: string, width: number): string {
    const rendered = String(value || '');
    const plain = stripAnsi(rendered);
    const plainWidth = getDisplayWidth(plain);
    if (plainWidth >= width) {
        return /\x1b\[[0-9;]*m/.test(rendered)
            ? fitAnsiLine(rendered, width)
            : sliceByDisplayWidth(rendered, width);
    }
    return `${rendered}${' '.repeat(width - plainWidth)}`;
}

export function renderTerminalBlockLines(contentLines: string[], options: TerminalBlockRenderOptions): string[] {
    const shellWidth = Math.max(MIN_TERMINAL_COLUMNS, options.width);
    const shellInnerWidth = Math.max(MIN_TERMINAL_CONTENT_WIDTH, shellWidth - 2);
    const paintLine = options.paint || ((value: string) => value);
    const shellCodes = options.shellCodes || [];
    const lineCodes = options.lineCodes || shellCodes;
    const body = contentLines.map(line => paintLine(` ${padTerminalDisplayText(line, shellInnerWidth)} `, ...lineCodes));
    if (options.frame === false) {
        return body;
    }
    return [
        paintLine(' '.repeat(shellWidth), ...shellCodes),
        ...body,
        paintLine(' '.repeat(shellWidth), ...shellCodes)
    ];
}

export function renderTerminalBlock(content: string, options: TerminalBlockRenderOptions): string[] {
    return renderTerminalBlockLines([content], options);
}

function paintTerminalText(value: string, ...codes: string[]): string {
    const prefix = codes.filter(Boolean).join('');
    return prefix ? `${prefix}${value}${TERMINAL_RENDER_ANSI.reset}` : value;
}

export function shouldUseAlternateScreen(env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {}): boolean {
    const configured = String(env.TSDI_AGENT_ALT_SCREEN || '').trim().toLowerCase();
    if (!configured) {
        return false;
    }
    return configured !== '0' && configured !== 'false' && configured !== 'no';
}

export function wrapTerminalText(value: string, width: number): string[] {
    const chunkWidth = Math.max(1, width);
    const normalized = String(value || '').replace(/\r/g, '').split('\n');
    const lines: string[] = [];
    normalized.forEach(line => {
        if (!line) {
            lines.push('');
            return;
        }
        let rest = line;
        while (rest) {
            const chunk = sliceByDisplayWidth(rest, chunkWidth) || rest.slice(0, chunkWidth);
            lines.push(chunk);
            rest = rest.slice(chunk.length);
        }
    });
    return lines.length ? lines : [''];
}

export function wrapPrefixedText(value: string, width: number, firstPrefix = '', continuationPrefix = ''): string[] {
    const normalized = String(value || '').replace(/\r/g, '').split('\n');
    const lines: string[] = [];
    let renderedAny = false;
    normalized.forEach(line => {
        const prefix = renderedAny ? continuationPrefix : firstPrefix;
        const availableWidth = Math.max(1, width - getDisplayWidth(prefix));
        if (!line) {
            lines.push(prefix);
            renderedAny = true;
            return;
        }
        wrapTerminalText(line, availableWidth).forEach((chunk, index) => {
            const currentPrefix = renderedAny || index > 0 ? continuationPrefix : firstPrefix;
            lines.push(`${currentPrefix}${chunk}`);
            renderedAny = true;
        });
    });
    return lines.length ? lines : [firstPrefix];
}

export function parseTerminalTextPromptChunk(chunk: Buffer | string): { text: string; submitted: boolean } {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '');
    const submitIndex = text.search(/[\r\n]/);
    if (submitIndex < 0) {
        return { text, submitted: false };
    }
    return {
        text: text.slice(0, submitIndex),
        submitted: true
    };
}

export function buildOsc52ClipboardSequence(text: string): string {
    const payload = Buffer.from(text, 'utf8').toString('base64');
    return `\x1b]52;c;${payload}\x07`;
}

export function shortenTerminalPath(workspace: string, home = typeof process !== 'undefined' ? (process.env.HOME || '') : ''): string {
    const value = String(workspace || '').trim();
    if (!value) {
        return '';
    }
    if (home && value.startsWith(home)) {
        return `~${value.slice(home.length)}`;
    }
    return value;
}

export function formatTerminalStatusFooter(model: string, profile: string, workspace: string): string {
    const modelLabel = String(model || '').trim();
    const profileLabel = String(profile || '').trim();
    const workspaceLabel = shortenTerminalPath(workspace);
    const left = [modelLabel, profileLabel].filter(Boolean).join(' ');
    return [left, workspaceLabel].filter(Boolean).join(' · ');
}

export function buildTerminalBrandBlock(width: number, appTitle = DEFAULT_TERMINAL_APP_TITLE, model = '', workspace = '', version = ''): string[] {
    const titleLine = version ? `${appTitle.toUpperCase()} v${version}` : appTitle.toUpperCase();
    const metaLine = formatTerminalStatusFooter(model, '', workspace);
    const maxInnerWidth = Math.max(1, width - 2);
    const innerWidth = Math.max(1, Math.min(
        maxInnerWidth,
        Math.max(8, getDisplayWidth(titleLine), getDisplayWidth(metaLine))
    ));
    const fitContent = (value: string, align: 'left' | 'center', ...codes: string[]): string => {
        const clipped = getDisplayWidth(value) > innerWidth
            ? sliceByDisplayWidth(value, innerWidth)
            : value;
        const remaining = Math.max(0, innerWidth - getDisplayWidth(clipped));
        const leftPadding = align === 'center' ? Math.floor(remaining / 2) : 0;
        const rightPadding = remaining - leftPadding;
        return `${paintTerminalText('│', TERMINAL_RENDER_ANSI.dim)}${' '.repeat(leftPadding)}${paintTerminalText(clipped, ...codes)}${' '.repeat(rightPadding)}${paintTerminalText('│', TERMINAL_RENDER_ANSI.dim)}`;
    };
    return [
        paintTerminalText(`╭${'─'.repeat(innerWidth)}╮`, TERMINAL_RENDER_ANSI.dim),
        fitContent(titleLine, 'center', TERMINAL_RENDER_ANSI.blueStrong),
        fitContent(metaLine, 'left', TERMINAL_RENDER_ANSI.dim),
        paintTerminalText(`╰${'─'.repeat(innerWidth)}╯`, TERMINAL_RENDER_ANSI.dim)
    ];
}

export function buildTerminalEmptyStateBlock(width: number, appTitle = DEFAULT_TERMINAL_APP_TITLE, model = '', workspace = '', version = ''): string[] {
    return buildTerminalBrandBlock(width, appTitle, model, workspace, version);
}

function paintTerminalToken(value: string, color?: string): string {
    return color ? paintTerminalText(value, color) : value;
}

interface StyledTerminalTextSegment {
    text: string;
    codes?: string[];
}

function isTerminalJsonLanguage(lang: string): boolean {
    return lang === 'json' || lang === 'jsonc';
}

function isTerminalShellLanguage(lang: string): boolean {
    return lang === 'bash' || lang === 'sh' || lang === 'shell' || lang === 'zsh';
}

function isTerminalJsLikeLanguage(lang: string): boolean {
    return !lang || lang === 'js' || lang === 'jsx' || lang === 'ts' || lang === 'tsx' || lang === 'javascript' || lang === 'typescript';
}

function mergeTerminalAnsiCodes(...groups: Array<string[] | undefined>): string[] | undefined {
    const merged = groups.flatMap(group => group || []).filter(Boolean);
    return merged.length ? merged : undefined;
}

function paintStyledTerminalSegment(segment: StyledTerminalTextSegment): string {
    return segment.codes?.length ? paintTerminalText(segment.text, ...segment.codes) : segment.text;
}

function unescapeTerminalMarkdownText(value: string): string {
    return String(value || '').replace(/\\([\\`*_{}\[\]()#+\-.!>])/g, '$1');
}

function tokenizeTerminalMarkdownInline(value: string, baseCodes?: string[]): StyledTerminalTextSegment[] {
    const input = String(value || '');
    const tokenPattern = /(`[^`\n]+`|!\[[^\]]*\]\(([^)]+)\)|\[[^\]]+\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*\n]+)\*|_([^_\n]+)_)/g;
    const segments: StyledTerminalTextSegment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = tokenPattern.exec(input))) {
        if (match.index > lastIndex) {
            segments.push({ text: unescapeTerminalMarkdownText(input.slice(lastIndex, match.index)), codes: baseCodes });
        }
        const token = match[0];
        if (token.startsWith('`')) {
            segments.push({ text: token.slice(1, -1), codes: mergeTerminalAnsiCodes(baseCodes, [TERMINAL_RENDER_ANSI.bgSelected, TERMINAL_RENDER_ANSI.amber]) });
        } else if (token.startsWith('![')) {
            const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(token);
            const alt = unescapeTerminalMarkdownText(imageMatch?.[1] || 'image');
            const url = unescapeTerminalMarkdownText(imageMatch?.[2] || '');
            segments.push({ text: alt, codes: mergeTerminalAnsiCodes(baseCodes, [TERMINAL_RENDER_ANSI.blueStrong]) });
            if (url) {
                segments.push({ text: ` (${url})`, codes: mergeTerminalAnsiCodes(baseCodes, [TERMINAL_RENDER_ANSI.dim]) });
            }
        } else if (token.startsWith('[')) {
            const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
            const label = unescapeTerminalMarkdownText(linkMatch?.[1] || '');
            const url = unescapeTerminalMarkdownText(linkMatch?.[2] || '');
            segments.push({ text: label || url, codes: mergeTerminalAnsiCodes(baseCodes, [TERMINAL_RENDER_ANSI.blueStrong]) });
            if (url && url !== label) {
                segments.push({ text: ` (${url})`, codes: mergeTerminalAnsiCodes(baseCodes, [TERMINAL_RENDER_ANSI.dim]) });
            }
        } else if (token.startsWith('**') || token.startsWith('__')) {
            segments.push({ text: unescapeTerminalMarkdownText(token.slice(2, -2)), codes: mergeTerminalAnsiCodes(baseCodes, [TERMINAL_RENDER_ANSI.blueStrong]) });
        } else if (token.startsWith('~~')) {
            segments.push({ text: unescapeTerminalMarkdownText(token.slice(2, -2)), codes: mergeTerminalAnsiCodes(baseCodes, [TERMINAL_RENDER_ANSI.dim]) });
        } else {
            segments.push({ text: unescapeTerminalMarkdownText(token.slice(1, -1)), codes: mergeTerminalAnsiCodes(baseCodes, [TERMINAL_RENDER_ANSI.blue]) });
        }
        lastIndex = match.index + token.length;
    }
    if (lastIndex < input.length) {
        segments.push({ text: unescapeTerminalMarkdownText(input.slice(lastIndex)), codes: baseCodes });
    }
    return segments.length ? segments : [{ text: unescapeTerminalMarkdownText(input), codes: baseCodes }];
}

function wrapStyledTerminalSegments(segments: StyledTerminalTextSegment[], width: number): string[] {
    const chunkWidth = Math.max(1, width);
    const lines: string[] = [];
    let currentLine = '';
    let currentWidth = 0;
    const flushLine = () => {
        lines.push(currentLine);
        currentLine = '';
        currentWidth = 0;
    };
    for (const segment of segments) {
        let rest = segment.text;
        while (rest) {
            if (currentWidth >= chunkWidth) {
                flushLine();
            }
            const availableWidth = Math.max(1, chunkWidth - currentWidth);
            const chunk = sliceByDisplayWidth(rest, availableWidth) || rest.slice(0, 1);
            currentLine += paintStyledTerminalSegment({ text: chunk, codes: segment.codes });
            currentWidth += getDisplayWidth(chunk);
            rest = rest.slice(chunk.length);
            if (rest && currentWidth >= chunkWidth) {
                flushLine();
            }
        }
    }
    if (!lines.length || currentLine || !segments.length) {
        lines.push(currentLine);
    }
    return lines;
}

function renderTerminalMarkdownTextLine(sourceLine: string, width: number): string[] {
    const chunkWidth = Math.max(12, width);
    const original = String(sourceLine || '');
    let line = original;
    let firstPrefix = '';
    let continuationPrefix = '';
    let baseCodes: string[] | undefined;
    const headingMatch = /^(\s*)(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
        firstPrefix = headingMatch[1];
        continuationPrefix = headingMatch[1];
        line = headingMatch[3];
        baseCodes = [TERMINAL_RENDER_ANSI.blueStrong];
    } else {
        const quoteMatch = /^(\s*)>\s?(.*)$/.exec(line);
        if (quoteMatch) {
            firstPrefix = `${quoteMatch[1]}| `;
            continuationPrefix = `${quoteMatch[1]}  `;
            line = quoteMatch[2];
            baseCodes = [TERMINAL_RENDER_ANSI.dim];
        } else {
            const taskMatch = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line);
            if (taskMatch) {
                firstPrefix = `${taskMatch[1]}[${taskMatch[2].toLowerCase() === 'x' ? 'x' : ' '}] `;
                continuationPrefix = `${taskMatch[1]}    `;
                line = taskMatch[3];
            } else {
                const orderedMatch = /^(\s*\d+\.)\s+(.*)$/.exec(line);
                if (orderedMatch) {
                    firstPrefix = `${orderedMatch[1]} `;
                    continuationPrefix = `${' '.repeat(getDisplayWidth(firstPrefix))}`;
                    line = orderedMatch[2];
                } else {
                    const bulletMatch = /^(\s*)[-*+]\s+(.*)$/.exec(line);
                    if (bulletMatch) {
                        firstPrefix = `${bulletMatch[1]}- `;
                        continuationPrefix = `${bulletMatch[1]}  `;
                        line = bulletMatch[2];
                    }
                }
            }
        }
    }
    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(original)) {
        return [paintTerminalText('-'.repeat(chunkWidth), TERMINAL_RENDER_ANSI.dim)];
    }
    const wrapped = wrapStyledTerminalSegments(
        tokenizeTerminalMarkdownInline(line, baseCodes),
        Math.max(1, chunkWidth - getDisplayWidth(firstPrefix || continuationPrefix))
    );
    return wrapped.map((chunk, index) => `${index === 0 ? firstPrefix : continuationPrefix}${chunk}`);
}

export function highlightTerminalCodeLine(line: string, language = ''): string {
    const lang = String(language || '').trim().toLowerCase();
    const source = String(line || '');
    const jsLike = isTerminalJsLikeLanguage(lang);
    const keywordSet = isTerminalShellLanguage(lang) ? SHELL_TERMINAL_KEYWORDS : JS_LIKE_TERMINAL_KEYWORDS;
    let index = 0;
    let result = '';
    while (index < source.length) {
        const rest = source.slice(index);
        if (rest.startsWith('//') && jsLike) {
            result += paintTerminalToken(rest, TERMINAL_RENDER_ANSI.dim);
            break;
        }
        if (rest.startsWith('#') && isTerminalShellLanguage(lang)) {
            result += paintTerminalToken(rest, TERMINAL_RENDER_ANSI.dim);
            break;
        }
        const char = source[index];
        if (char === '"' || char === '\'' || char === '`') {
            let end = index + 1;
            while (end < source.length) {
                if (source[end] === '\\') {
                    end += 2;
                    continue;
                }
                if (source[end] === char) {
                    end += 1;
                    break;
                }
                end += 1;
            }
            const token = source.slice(index, end);
            if (isTerminalJsonLanguage(lang)) {
                const remaining = source.slice(end);
                result += paintTerminalToken(token, /^(\s*):/.test(remaining) ? TERMINAL_RENDER_ANSI.blueStrong : TERMINAL_RENDER_ANSI.green);
            } else {
                result += paintTerminalToken(token, TERMINAL_RENDER_ANSI.green);
            }
            index = end;
            continue;
        }
        const numberMatch = /^\d+(?:\.\d+)?/.exec(rest);
        if (numberMatch) {
            result += paintTerminalToken(numberMatch[0], TERMINAL_RENDER_ANSI.amber);
            index += numberMatch[0].length;
            continue;
        }
        const variableMatch = isTerminalShellLanguage(lang) ? /^\$[A-Za-z_][A-Za-z0-9_]*/.exec(rest) : null;
        if (variableMatch) {
            result += paintTerminalToken(variableMatch[0], TERMINAL_RENDER_ANSI.blue);
            index += variableMatch[0].length;
            continue;
        }
        const identifierMatch = /^[A-Za-z_$][A-Za-z0-9_$-]*/.exec(rest);
        if (identifierMatch) {
            const token = identifierMatch[0];
            if (keywordSet.has(token)) {
                result += paintTerminalToken(token, TERMINAL_RENDER_ANSI.blueStrong);
            } else if (token === 'true' || token === 'false' || token === 'null') {
                result += paintTerminalToken(token, TERMINAL_RENDER_ANSI.amber);
            } else {
                result += token;
            }
            index += token.length;
            continue;
        }
        result += char;
        index += 1;
    }
    return result;
}

export function renderTerminalMarkdownLines(content: string, width: number): string[] {
    const chunkWidth = Math.max(12, width);
    const sourceLines = String(content || '').replace(/\r/g, '').split('\n');
    const rendered: string[] = [];
    let inFence = false;
    let fenceLanguage = '';
    for (const sourceLine of sourceLines) {
        const trimmed = sourceLine.trim();
        if (trimmed.startsWith('```')) {
            if (inFence) {
                inFence = false;
                fenceLanguage = '';
                continue;
            }
            inFence = true;
            fenceLanguage = trimmed.slice(3).trim().toLowerCase();
            continue;
        }
        if (inFence) {
            wrapTerminalText(sourceLine, chunkWidth).forEach(line => rendered.push(highlightTerminalCodeLine(line, fenceLanguage)));
            continue;
        }
        rendered.push(...renderTerminalMarkdownTextLine(sourceLine, chunkWidth));
    }
    return rendered.length ? rendered : ['…'];
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

export function windowRenderedLinesFromBottom(lines: string[], maxRows: number, scrollOffset = 0): TerminalRenderedWindow {
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

function trimRenderedBlockEdge(lines: string[], maxRows: number, fromEnd: boolean): string[] {
    if (maxRows <= 0) {
        return [];
    }
    if (lines.length <= maxRows) {
        return lines.slice();
    }
    if (maxRows === 1) {
        return ['…'];
    }
    if (fromEnd) {
        return ['…', ...lines.slice(lines.length - (maxRows - 1))];
    }
    return [...lines.slice(0, maxRows - 1), '…'];
}

export function windowRenderedBlocksFromBottomWithContext(blocks: string[][], maxRows: number, minLatestRows = 0): TerminalRenderedWindow {
    if (maxRows <= 0) {
        return { lines: [], startRow: 0, totalRows: 0 };
    }
    const normalizedBlocks = blocks
        .map(block => compactRenderedLines(block, block.length || 0))
        .filter(block => block.length > 0);
    if (!normalizedBlocks.length) {
        return { lines: [], startRow: 0, totalRows: 0 };
    }
    const totalRows = normalizedBlocks.reduce((sum, block) => sum + block.length, 0);
    const rowOffsets: number[] = [];
    let nextOffset = 0;
    normalizedBlocks.forEach(block => {
        rowOffsets.push(nextOffset);
        nextOffset += block.length;
    });
    if (totalRows <= maxRows) {
        return {
            lines: normalizedBlocks.flat(),
            startRow: 0,
            totalRows
        };
    }
    const latestIndex = normalizedBlocks.length - 1;
    const latestBlock = normalizedBlocks[latestIndex];
    if (normalizedBlocks.length === 1) {
        return {
            lines: trimRenderedBlockEdge(latestBlock, maxRows, true),
            startRow: rowOffsets[latestIndex] + Math.max(0, latestBlock.length - Math.max(1, maxRows - 1)),
            totalRows
        };
    }
    const latestFloor = Math.max(1, Math.min(maxRows, minLatestRows || 0));
    const historyRows = Math.max(0, maxRows - latestFloor);
    const priorLines = normalizedBlocks.slice(0, latestIndex).flat();
    const historyWindow = historyRows > 0 ? trimRenderedBlockEdge(priorLines, historyRows, true) : [];
    const latestRows = Math.max(1, maxRows - historyWindow.length);
    const latestWindow = latestBlock.length > latestRows
        ? trimRenderedBlockEdge(latestBlock, latestRows, true)
        : latestBlock.slice();
    const rendered = [...historyWindow, ...latestWindow];
    const priorTotalRows = rowOffsets[latestIndex];
    const historyStartRow = historyWindow.length === 0
        ? rowOffsets[latestIndex]
        : priorLines.length <= historyWindow.length
            ? 0
            : Math.max(0, priorTotalRows - Math.max(0, historyWindow.length - 1));
    const latestStartRow = latestBlock.length > latestRows
        ? rowOffsets[latestIndex] + Math.max(0, latestBlock.length - Math.max(1, latestRows - 1))
        : rowOffsets[latestIndex];
    return {
        lines: rendered.slice(-maxRows),
        startRow: historyWindow.length > 0 ? historyStartRow : latestStartRow,
        totalRows
    };
}

export function compactRenderedBlocksWindow(blocks: string[][], maxRows: number, anchorIndex = -1): TerminalRenderedWindow {
    if (maxRows <= 0) {
        return { lines: [], startRow: 0, totalRows: 0 };
    }
    const normalizedBlocks = blocks
        .map(block => compactRenderedLines(block, block.length || 0))
        .filter(block => block.length > 0);
    if (!normalizedBlocks.length) {
        return { lines: [], startRow: 0, totalRows: 0 };
    }
    const totalRows = normalizedBlocks.reduce((sum, block) => sum + block.length, 0);
    const rowOffsets: number[] = [];
    let nextOffset = 0;
    normalizedBlocks.forEach(block => {
        rowOffsets.push(nextOffset);
        nextOffset += block.length;
    });
    if (totalRows <= maxRows) {
        return {
            lines: normalizedBlocks.flat(),
            startRow: 0,
            totalRows
        };
    }

    const resolvedAnchor = Math.max(0, Math.min(
        normalizedBlocks.length - 1,
        anchorIndex >= 0 ? anchorIndex : normalizedBlocks.length - 1
    ));
    const anchorBlock = normalizedBlocks[resolvedAnchor];
    if (anchorBlock.length >= maxRows) {
        const fromEnd = resolvedAnchor > 0;
        return {
            lines: trimRenderedBlockEdge(anchorBlock, maxRows, fromEnd),
            startRow: fromEnd
                ? rowOffsets[resolvedAnchor] + Math.max(0, anchorBlock.length - Math.max(1, maxRows - 1))
                : rowOffsets[resolvedAnchor],
            totalRows
        };
    }

    let start = resolvedAnchor;
    let end = resolvedAnchor;
    let usedRows = anchorBlock.length;
    const centered = resolvedAnchor < normalizedBlocks.length - 1;
    let preferNext = centered;

    const tryExtend = (direction: 'prev' | 'next'): boolean => {
        if (direction === 'prev') {
            const nextIndex = start - 1;
            if (nextIndex < 0) {
                return false;
            }
            const nextBlock = normalizedBlocks[nextIndex];
            if (usedRows + nextBlock.length > maxRows) {
                return false;
            }
            start = nextIndex;
            usedRows += nextBlock.length;
            return true;
        }
        const nextIndex = end + 1;
        if (nextIndex >= normalizedBlocks.length) {
            return false;
        }
        const nextBlock = normalizedBlocks[nextIndex];
        if (usedRows + nextBlock.length > maxRows) {
            return false;
        }
        end = nextIndex;
        usedRows += nextBlock.length;
        return true;
    };

    while (usedRows < maxRows) {
        const primary = preferNext ? 'next' : 'prev';
        const secondary = preferNext ? 'prev' : 'next';
        const extended = tryExtend(primary) || tryExtend(secondary);
        if (!extended) {
            break;
        }
        if (centered) {
            preferNext = !preferNext;
        }
    }

    const rendered: string[] = [];
    const remainingRows = maxRows - usedRows;
    let startRow = rowOffsets[start];
    if (remainingRows > 0 && start > 0) {
        const previousBlock = normalizedBlocks[start - 1];
        rendered.push(...trimRenderedBlockEdge(previousBlock, remainingRows, true));
        startRow = previousBlock.length > remainingRows
            ? rowOffsets[start - 1] + Math.max(0, previousBlock.length - Math.max(1, remainingRows - 1))
            : rowOffsets[start - 1];
    }
    for (let index = start; index <= end; index++) {
        rendered.push(...normalizedBlocks[index]);
    }
    if (remainingRows > 0 && rendered.length < maxRows && end < normalizedBlocks.length - 1) {
        rendered.push(...trimRenderedBlockEdge(
            normalizedBlocks[end + 1],
            Math.max(0, maxRows - rendered.length),
            false
        ));
    }
    return {
        lines: rendered.slice(0, maxRows),
        startRow,
        totalRows
    };
}

export function compactRenderedBlocks(blocks: string[][], maxRows: number, anchorIndex = -1): string[] {
    return compactRenderedBlocksWindow(blocks, maxRows, anchorIndex).lines;
}

function windowTerminalBlocksForPrimaryScreen(blocks: string[][], maxRows: number, minLatestRows = 0): TerminalRenderedWindow {
    if (maxRows <= 0) {
        return { lines: [], startRow: 0, totalRows: 0 };
    }
    const normalizedBlocks = blocks
        .map(block => compactRenderedLines(block, block.length || 0))
        .filter(block => block.length > 0);
    const totalRows = normalizedBlocks.reduce((sum, block) => sum + block.length, 0);
    if (totalRows <= maxRows) {
        return {
            lines: normalizedBlocks.flat(),
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
        .flat();
    const precedingWindow = windowRenderedLinesFromBottom(precedingLines, remainingRows, 0);
    const lines = [...precedingWindow.lines, ...latestTail].slice(-maxRows);
    return {
        lines,
        startRow: Math.max(0, totalRows - lines.length),
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
            ? windowRenderedLinesFromBottom(transcriptLines, availableTranscriptRows, options.scrollOffset)
            : typeof options.anchorBlockIndex === 'number' && options.anchorBlockIndex >= 0
                ? compactRenderedBlocksWindow(transcriptBlocks, availableTranscriptRows, options.anchorBlockIndex)
                : windowTerminalBlocksForPrimaryScreen(transcriptBlocks, availableTranscriptRows, options.minContextRows || 0);
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
    const isSameCursorTarget = (left?: TerminalCursorTarget, right?: TerminalCursorTarget): boolean => {
        if (!left || !right) {
            return !left && !right;
        }
        return left.row === right.row && left.column === right.column;
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
        if (!options.placeCursor
            || cursorMode !== 'prompt'
            || !cursorTarget
            || (previous.cursorMode === cursorMode
                && previous.terminalRow === cursorTarget.row
                && isSameCursorTarget(previous.cursorTarget, cursorTarget))) {
            return {
                output: '',
                fittedLines,
                cursorRow,
                terminalRow: previous.terminalRow ?? cursorRow,
                changed: false,
                state: createNextState(previous.terminalRow ?? cursorRow)
            };
        }
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
    const commonPrefixRows = resolveCommonPrefixRowCount(previous.paintedLines, fittedLines);
    const stablePrefixExtendsPrevious = previous.renderKey.startsWith('inline:')
        && width === previous.paintedWidth
        && previous.cursorMode === 'prompt'
        && previousStablePrefixRows > 0
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
    } else if (previous.renderKey.startsWith('inline:')
        && width === previous.paintedWidth
        && commonPrefixRows > 0) {
        const previousTerminalRow = Math.max(0, Math.min(
            previous.terminalRow ?? previous.cursorRow,
            Math.max(0, previous.paintedLines.length - 1)
        ));
        const commands: string[] = ['\r'];
        const delta = commonPrefixRows - previousTerminalRow;
        if (delta < 0) {
            commands.push(`\x1b[${Math.abs(delta)}A`);
        } else if (delta > 0) {
            commands.push(`\x1b[${delta}B`);
        }
        commands.push('\x1b[J');
        const updatedLines = fittedLines.slice(commonPrefixRows);
        output = `${commands.join('')}${updatedLines.length ? updatedLines.join('\n') : ''}`;
        terminalRow = updatedLines.length
            ? commonPrefixRows + updatedLines.length - 1
            : Math.max(0, Math.min(commonPrefixRows, Math.max(0, fittedLines.length - 1)));
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

function resolveCommonPrefixRowCount(previousLines: string[], nextLines: string[]): number {
    const max = Math.min(previousLines.length, nextLines.length);
    let index = 0;
    while (index < max && previousLines[index] === nextLines[index]) {
        index++;
    }
    return index;
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

export function renderSelectMenu(title: string, options: SelectMenuOption[], selectedIndex: number, hint = DEFAULT_CONSOLE_SELECT_HINT): string[] {
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
