/**
 * @file Cross-platform console abstraction ports.
 *
 * agent-ui/src/ must NOT directly import from @tsdi/components/console or
 * node libraries. This file defines DI tokens and interfaces that the
 * console/ entry point (@tsdi/agent-ui/console) implements.
 */
import { InjectToken } from '@tsdi/ioc';

// ── Abstract classes (platform provides concrete implementation) ────────────

/** Handles terminal input sequences (keyboard, mouse). */
export abstract class ConsoleTerminalInputHandler {}

/** Manages terminal surface lifecycle (resize, focus, etc.). */
export abstract class ConsoleTerminalSurfaceLifecycle {}

/** Accessor for the terminal surface element. */
export abstract class ConsoleTerminalSurfaceAccessor {
    writeTerminalClipboardText?(text: string): void;
    abstract getLastRenderedLines(): string[];
    abstract getLastRenderedText(stripAnsi?: (value: string) => string): string;
    dispatchMouse?(event: SelectMenuMouseEvent): void;
    scrollViewport?(deltaRows: number): boolean;
    scrollViewportToEdge?(edge: 'start' | 'end'): boolean;
    writeRawTerminalData?(data: string): void;
    notifyNonMouseInput?(): void;
    stopTerminal?(): void;
    getTerminalSize?(): { columns?: number; cols?: number; rows: number };
    resetTerminalRenderState?(): void;
}

/** Application bootstrap hook supplied by the platform adapter. */
export abstract class ConsoleTerminalApplicationLifecycleService {}

// ── Re-usable value types (platform-independent, defined here) ──────────────

export type ConsoleTextChunk = Uint8Array | string;

export type ConsoleEnterAction = 'submit' | 'newline' | 'confirm-selection';

export interface ConsoleTextInputChunkOptions {
    submitOnEnter?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    hasSelectMenu?: boolean;
}

export interface ConsoleTextInputChunkResult {
    value: string;
    cursor: number;
    shouldSubmit: boolean;
    shouldConfirmSelection: boolean;
}

export interface ConsoleSelectWindow {
    start: number;
    count: number;
}

export type ConsoleListWindow = ConsoleSelectWindow;

export interface SelectMenuMouseEvent {
    button: number;
    x: number;
    y: number;
    release: boolean;
}

export interface TerminalInputSequenceResult {
    text: string;
    controlKey?: string;
    mouse?: SelectMenuMouseEvent;
    partial: boolean;
}

// ── ConsoleUtils — pure-function abstraction ────────────────────────────────

export interface ConsoleUtils {
    clampConsoleTextCursor(value: string, cursor: number): number;

    processConsoleTextInputChunk(
        value: string,
        cursor: number,
        chunk: Uint8Array | string,
        options?: ConsoleTextInputChunkOptions
    ): ConsoleTextInputChunkResult;

    shouldSkipConsoleHistoryEntry(entry: string): boolean;

    formatTerminalStatusFooter(model: string, profile: string, workspace: string): string;

    resolveConsoleListWindow(
        itemsLength: number,
        selectedIndex: number,
        visibleCount: number
    ): ConsoleSelectWindow;

    resolveConsoleEnterAction(options?: {
        ctrlKey?: boolean;
        altKey?: boolean;
        hasSelectMenu?: boolean;
    }): ConsoleEnterAction;

    resolveConsoleSelectWindow(
        optionsLength: number,
        selectedIndex: number,
        visibleCount: number
    ): ConsoleSelectWindow;

    formatConsoleIndexedOptionLabel(index: number, label: string, selected?: boolean): string;

    buildTerminalBrandBlock(
        width: number,
        appTitle?: string,
        model?: string,
        workspace?: string,
        version?: string
    ): string[];

    /** Cross-platform base64 encode (Buffer in Node, btoa in browser). */
    encodeBase64(bytes: Uint8Array): string;

    /** Cross-platform base64 decode (Buffer in Node, atob in browser). */
    decodeBase64(value: string): Uint8Array;
}

// ── DI tokens ──────────────────────────────────────────────────────────────

export const CONSOLE_UTILS = new InjectToken<ConsoleUtils>('ConsoleUtils');

// ── Constants (platform-independent) ───────────────────────────────────────

/** Sequence clearing the terminal screen and scrollback (ED2 + ED3 + cursor home). */
export const CLEAR_SCROLLBACK_SEQUENCE = '\x1b[2J\x1b[3J\x1b[H';

/** Default terminal column width when not detected from the environment. */
export const DEFAULT_TERMINAL_COLUMNS = 100;
