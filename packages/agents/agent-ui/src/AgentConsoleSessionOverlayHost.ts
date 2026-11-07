import type { ToastEntry } from '@tsdi/components/common';
import type { CommandOutputStore } from './AgentConsoleCommandOutputHistory';
import type { AgentConsoleCommandOutputEntry } from './AgentConsoleSessionState';
import { AgentConsoleSessionTranscriptHost } from './AgentConsoleSessionTranscriptHost';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import {
    closeCommandOutputs as closeCommandOutputsInState,
    closeTextOverlay as closeTextOverlayInState,
    copySelectedCommandOutput as copySelectedCommandOutputInState,
    hasCommandOutputsFocus as hasCommandOutputsFocusInState,
    hasTextOverlayFocus as hasTextOverlayFocusInState,
    loadCommandOutputHistory as loadCommandOutputHistoryInState,
    moveCommandOutputSelection as moveCommandOutputSelectionInState,
    openCommandOutputs as openCommandOutputsInState,
    openTextOverlay as openTextOverlayInState,
    persistCommandOutput as persistCommandOutputInState,
    pushCommandOutput as pushCommandOutputInState,
    scrollCommandOutputsPage as scrollCommandOutputsPageInState,
    scrollCommandOutputsToEdge as scrollCommandOutputsToEdgeInState,
    scrollTextOverlay as scrollTextOverlayInState,
    scrollTextOverlayPage as scrollTextOverlayPageInState,
    scrollTextOverlayToEdge as scrollTextOverlayToEdgeInState,
    setCommandOutputStore as setCommandOutputStoreInState,
    setCommandOutputsFilter as setCommandOutputsFilterInState,
    setNotice as setNoticeInState,
    toggleCommandOutputs as toggleCommandOutputsInState
} from './AgentConsoleOverlayState';

/** Notice, text overlay and command output projection facade. */
export abstract class AgentConsoleSessionOverlayHost extends AgentConsoleSessionTranscriptHost {
    protected abstract self(): AgentConsoleSessionState;

    setNotice(message: string): void { setNoticeInState(this.self(), message); }
    setToasts(entries: readonly ToastEntry[]): void { this.self().toasts = Array.isArray(entries) ? [...entries] : []; }
    openTextOverlay(title: string, lines: string[], visibleLines?: number): void { openTextOverlayInState(this.self(), title, lines, visibleLines); }
    closeTextOverlay(): void { closeTextOverlayInState(this.self()); }
    hasTextOverlayFocus(): boolean { return hasTextOverlayFocusInState(this.self()); }
    pushCommandOutput(command: string, text: string, kind: AgentConsoleCommandOutputEntry['kind'] = 'result'): string { return pushCommandOutputInState(this.self(), command, text, kind); }
    persistCommandOutput(entry: AgentConsoleCommandOutputEntry): Promise<void> { return persistCommandOutputInState(this.self(), entry); }
    setCommandOutputStore(store: CommandOutputStore | undefined): void { setCommandOutputStoreInState(this.self(), store); }
    async loadCommandOutputHistory(): Promise<void> { return loadCommandOutputHistoryInState(this.self()); }
    openCommandOutputs(): void { openCommandOutputsInState(this.self()); }
    closeCommandOutputs(): void { closeCommandOutputsInState(this.self()); }
    toggleCommandOutputs(): void { toggleCommandOutputsInState(this.self()); }
    hasCommandOutputsFocus(): boolean { return hasCommandOutputsFocusInState(this.self()); }
    setCommandOutputsFilter(filter: string): void { setCommandOutputsFilterInState(this.self(), filter); }
    moveCommandOutputSelection(delta: number): void { moveCommandOutputSelectionInState(this.self(), delta); }
    copySelectedCommandOutput(): Promise<boolean> { return copySelectedCommandOutputInState(this.self()); }
    scrollCommandOutputsToEdge(position: 'start' | 'end'): void { scrollCommandOutputsToEdgeInState(this.self(), position); }
    scrollCommandOutputsPage(delta: number, pageSize?: number): void { scrollCommandOutputsPageInState(this.self(), delta, pageSize); }
    scrollTextOverlay(delta: number): void { scrollTextOverlayInState(this.self(), delta); }
    scrollTextOverlayPage(delta: number, pageSize?: number): void { scrollTextOverlayPageInState(this.self(), delta, pageSize); }
    scrollTextOverlayToEdge(position: 'start' | 'end'): void { scrollTextOverlayToEdgeInState(this.self(), position); }

    get visibleCommandOutputs(): AgentConsoleCommandOutputEntry[] {
        const needle = this.commandOutputsFilter.trim().toLowerCase();
        if (!needle) {
            return this.commandOutputs;
        }
        return this.commandOutputs.filter(entry =>
            entry.command.toLowerCase().includes(needle) || entry.text.toLowerCase().includes(needle)
        );
    }

    get textOverlayPageSize(): number {
        return this.textOverlay?.visibleLines ?? this.consoleOptions.reviewDetailVisibleLines;
    }

    get textOverlayVisibleLines(): string[] {
        if (!this.textOverlay) {
            return [];
        }
        const visible = this.textOverlayPageSize;
        return this.textOverlay.lines.slice(this.textOverlay.scroll, this.textOverlay.scroll + visible);
    }
}
