/**
 * @file Cross-platform console abstraction ports.
 *
 * agent-ui/src/ must NOT directly import from @tsdi/components/console or
 * node libraries. This file defines DI tokens and interfaces that the
 * console/ entry point (@tsdi/agent-ui/console) implements.
 */
import { InjectionToken } from '@tsdi/ioc';

// ── Abstract classes (platform provides concrete implementation) ────────────

/** Handles terminal input sequences (keyboard, mouse). */
export abstract class ConsoleTerminalInputHandler {}

/** Manages terminal surface lifecycle (resize, focus, etc.). */
export abstract class ConsoleTerminalSurfaceLifecycle {}

/** Accessor for the terminal surface element. */
export abstract class ConsoleTerminalSurfaceAccessor {}

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
        chunk: Buffer,
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

// ── ConsoleComponents — template directive/component class references ───────

export interface ConsoleComponents {
    BrDirective: any;
    DivDirective: any;
    SpanDirective: any;
    LabelComponent: any;
    PanelComponent: any;
    TuiSelectComponent: any;
    TuiTextareaComponent: any;
}

/** Mutable registry populated by the platform entry point. */
export const consoleComponents: ConsoleComponents = {
    BrDirective: null,
    DivDirective: null,
    SpanDirective: null,
    LabelComponent: null,
    PanelComponent: null,
    TuiSelectComponent: null,
    TuiTextareaComponent: null
};

// ── DI tokens ──────────────────────────────────────────────────────────────

export const CONSOLE_UTILS = new InjectionToken<ConsoleUtils>('ConsoleUtils');
export const CONSOLE_COMPONENTS = new InjectionToken<ConsoleComponents>('ConsoleComponents');

// ── Constants (platform-independent) ───────────────────────────────────────

/** Default terminal column width when not detected from the environment. */
export const DEFAULT_TERMINAL_COLUMNS = 100;
