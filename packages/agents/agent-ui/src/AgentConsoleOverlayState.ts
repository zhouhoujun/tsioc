import type { AgentConsoleCommandOutputEntry, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP } from './AgentConsoleSessionState';
import type { CommandOutputStore } from './AgentConsoleCommandOutputHistory';
import type { AgentConsoleCommandOutputHistoryEntry } from './AgentConsoleCommandOutputHistory';
import { redactCommandOutputSecret } from './AgentConsoleCommandOutputHistory';

export function setNotice(state: AgentConsoleSessionState, message: string): void {
        state.notice = message;
    }

export function openTextOverlay(state: AgentConsoleSessionState, title: string, lines: string[], visibleLines?: number): void {
        const content = (Array.isArray(lines) ? lines : []).map(line => String(line ?? ''));
        if (!content.length) {
            return;
        }
        const page = typeof visibleLines === 'number' && visibleLines > 0 ? Math.min(Math.floor(visibleLines), content.length) : undefined;
        state.textOverlay = { title: String(title || ''), lines: content, scroll: 0, ...(page ? { visibleLines: page } : {}) };
        state.syncDerivedInputFocus();
    }

export function closeTextOverlay(state: AgentConsoleSessionState): void {
        if (!state.textOverlay) {
            return;
        }
        state.textOverlay = null;
        state.syncDerivedInputFocus();
    }

export function hasTextOverlayFocus(state: AgentConsoleSessionState): boolean {
        return !!state.textOverlay;
    }

export function pushCommandOutput(state: AgentConsoleSessionState, command: string, text: string, kind: AgentConsoleCommandOutputEntry['kind'] = 'result'): string {
        const body = String(text ?? '').trim();
        if (!body || !String(command ?? '').trim()) {
            return '';
        }
        const entry: AgentConsoleCommandOutputEntry = {
            id: `output-${++state.commandOutputSequence}`,
            command: String(command).trim(),
            text: body,
            ts: Date.now(),
            kind
        };
        state.commandOutputs = [entry, ...state.commandOutputs].slice(0, AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP);
        if (state.commandOutputsSelectedIndex >= state.visibleCommandOutputs.length) {
            state.commandOutputsSelectedIndex = Math.max(0, state.visibleCommandOutputs.length - 1);
        }
        state.persistCommandOutput(entry);
        return entry.id;
    }

export function persistCommandOutput(state: AgentConsoleSessionState, entry: AgentConsoleCommandOutputEntry): Promise<void> {
        const store = state.commandOutputStore;
        if (!store) {
            return Promise.resolve();
        }
        const execution = state.latestCommandExecution;
        const historyEntry: AgentConsoleCommandOutputHistoryEntry = {
            ...entry,
            text: redactCommandOutputSecret(entry.text),
            argsSummary: execution && execution.command === entry.command ? execution.args : undefined,
            requestId: execution && execution.status === 'running' ? execution.requestId : undefined,
            status: entry.kind === 'error' ? 'failed' : undefined,
            sessionId: state.sessionId || undefined,
            source: 'local'
        };
        return store.append(historyEntry) as Promise<void>;
    }

export function setCommandOutputStore(state: AgentConsoleSessionState, store: CommandOutputStore | undefined): void {
        state.commandOutputStore = store;
    }

export async function loadCommandOutputHistory(state: AgentConsoleSessionState): Promise<void> {
        const store = state.commandOutputStore;
        if (!store) {
            return;
        }
        const page = await store.list({ sessionId: state.sessionId, limit: AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP });
        if (page.items.length) {
            state.commandOutputs = page.items.slice(0, AGENT_CONSOLE_COMMAND_OUTPUT_RING_CAP) as unknown as AgentConsoleCommandOutputEntry[];
        }
    }

export function openCommandOutputs(state: AgentConsoleSessionState): void {
        state.commandOutputsOpen = true;
        state.commandOutputsFilter = '';
        state.commandOutputsFilterMode = false;
        state.commandOutputsSelectedIndex = 0;
        state.syncDerivedInputFocus();
    }

export function closeCommandOutputs(state: AgentConsoleSessionState): void {
        if (!state.commandOutputsOpen) {
            return;
        }
        state.commandOutputsOpen = false;
        state.commandOutputsFilter = '';
        state.commandOutputsFilterMode = false;
        state.commandOutputsSelectedIndex = 0;
        state.syncDerivedInputFocus();
    }

export function toggleCommandOutputs(state: AgentConsoleSessionState): void {
        if (state.commandOutputsOpen) {
            state.closeCommandOutputs();
        } else {
            state.openCommandOutputs();
        }
    }

export function hasCommandOutputsFocus(state: AgentConsoleSessionState): boolean {
        return state.commandOutputsOpen;
    }

export function setCommandOutputsFilter(state: AgentConsoleSessionState, filter: string): void {
        state.commandOutputsFilter = String(filter ?? '').slice(0, 64);
        state.commandOutputsSelectedIndex = 0;
    }

export function moveCommandOutputSelection(state: AgentConsoleSessionState, delta: number): void {
        const count = state.visibleCommandOutputs.length;
        if (!count) {
            state.commandOutputsSelectedIndex = 0;
            return;
        }
        state.commandOutputsSelectedIndex = Math.max(0, Math.min(count - 1, state.commandOutputsSelectedIndex + delta));
    }

export async function copySelectedCommandOutput(state: AgentConsoleSessionState): Promise<boolean> {
        const selected = state.visibleCommandOutputs[state.commandOutputsSelectedIndex];
        if (!selected || !state.copyFocusedTextAction) {
            return Promise.resolve(false);
        }
        Promise.resolve(state.copyFocusedTextAction(
            selected.text,
            `command ${selected.command} output`
        )).catch(() => {
            return;
        });
        return Promise.resolve(true);
    }

export function scrollCommandOutputsToEdge(state: AgentConsoleSessionState, position: 'start' | 'end'): void {
        const count = state.visibleCommandOutputs.length;
        if (!count) {
            state.commandOutputsSelectedIndex = 0;
            return;
        }
        state.commandOutputsSelectedIndex = position === 'start' ? 0 : count - 1;
    }

export function scrollCommandOutputsPage(state: AgentConsoleSessionState, delta: number, pageSize?: number): void {
        const count = state.visibleCommandOutputs.length;
        if (!count) {
            state.commandOutputsSelectedIndex = 0;
            return;
        }
        const resolvedPageSize = Math.max(1, pageSize ?? state.consoleOptions.reviewDetailPageSize);
        state.moveCommandOutputSelection(delta * resolvedPageSize);
    }

export function scrollTextOverlay(state: AgentConsoleSessionState, delta: number): void {
        if (!state.textOverlay) {
            return;
        }
        const visible = state.textOverlayPageSize;
        const maxScroll = Math.max(0, state.textOverlay.lines.length - visible);
        state.textOverlay.scroll = Math.max(0, Math.min(maxScroll, state.textOverlay.scroll + delta));
    }

export function scrollTextOverlayPage(state: AgentConsoleSessionState, delta: number, pageSize?: number): void {
        if (!state.textOverlay) {
            return;
        }
        const resolvedPageSize = pageSize ?? state.consoleOptions.reviewDetailPageSize;
        state.scrollTextOverlay(delta * Math.max(1, resolvedPageSize));
    }

export function scrollTextOverlayToEdge(state: AgentConsoleSessionState, position: 'start' | 'end'): void {
        if (!state.textOverlay) {
            return;
        }
        const visible = state.textOverlayPageSize;
        state.textOverlay.scroll = position === 'start' ? 0 : Math.max(0, state.textOverlay.lines.length - visible);
    }
