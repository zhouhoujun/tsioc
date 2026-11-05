import type { AgentMessage } from '@tsdi/agent';
import { CLEAR_SCROLLBACK_SEQUENCE, type ConsoleTextChunk } from './console-ports';
import type { TerminalInputSequenceResult } from './console-ports';
import type { AgentConsoleHealthItem } from './AgentConsoleSessionState';
import type { AgentConsoleGlobalAction, AgentConsoleKeymap } from './AgentConsoleKeymap';
import { AGENT_CONSOLE_DEFAULT_KEYMAP } from './AgentConsoleKeymap';
import { AgentConsolePolicyHost } from './AgentConsolePolicyHost';
import {
    EditModeHandlerContext,
    dismissEditMode,
    enterEditMode,
    handleIdleEscape,
    startEditTarget
} from './AgentConsoleEditModeHandlers';
import { decodeGlobalKey } from './AgentConsoleStreamHelpers';
import {
    executeGlobalKeyActionView,
    handleBrowserGlobalKeyInputView,
    handleGlobalKeyInputView
} from './AgentConsoleGlobalKeyInputController';
import {
    closingSessionMessageView,
    handleTerminalInputView,
    openCommandPaletteView,
    requestTerminalExitView
} from './AgentConsoleTerminalInputController';
import { collectHealthItems } from './AgentConsoleHealthView';
import { navigateThreadCycle } from './AgentConsoleProjectProjection';
import { globalKeyInputHost, terminalInputHost } from './AgentConsoleHostFactories';
import { editCtx } from './AgentConsoleHandlerContexts';

/** Terminal input, global keymap, editing, overlay and navigation projections. */
export abstract class AgentConsoleKeyInputHost extends AgentConsolePolicyHost {
    protected abstract globalKeymap?: AgentConsoleKeymap | null;
    protected abstract openSession(sessionId?: string): Promise<void>;

    protected editCtx(): EditModeHandlerContext { return editCtx(this); }

    protected decodeGlobalKey(raw: string): string {
        return decodeGlobalKey(raw);
    }

    protected async handleGlobalKeyInput(raw: string): Promise<boolean> {
        return handleGlobalKeyInputView(globalKeyInputHost(this), raw);
    }

    protected async handleBrowserGlobalKeyInput(key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }): Promise<boolean> {
        return handleBrowserGlobalKeyInputView(globalKeyInputHost(this), key, modifiers);
    }

    /**
     * P130 edit-last-message Esc state machine (G55/G70):
     * edit-active Esc dismisses (records target for step-back); idle double
     * Esc within the configured editEscapeWindowMs re-enters at the previous message, or
     * at the last editable user message when no dismissal is recent.
     */
    protected async handleIdleEscape(): Promise<boolean> {
        return handleIdleEscape(this.editCtx());
    }

    protected async enterEditMode(): Promise<boolean> {
        return enterEditMode(this.editCtx());
    }

    protected startEditTarget(target: AgentMessage): void {
        startEditTarget(this.editCtx(), target);
    }

    protected dismissEditMode(): boolean {
        return dismissEditMode(this.editCtx());
    }

    protected async executeGlobalKeyAction(action: AgentConsoleGlobalAction): Promise<boolean> {
        return executeGlobalKeyActionView(globalKeyInputHost(this), action);
    }

    protected clearScrollback(): boolean {
        if (this.surfaceAccessor) {
            this.surfaceAccessor.writeRawTerminalData?.(CLEAR_SCROLLBACK_SEQUENCE);
            this.surfaceAccessor.resetTerminalRenderState?.();
        }
        return true;
    }

    protected toggleWhichKeyOverlay(): void {
        const visible = !this.state.whichKeyVisible;
        if (visible) {
            this.state.whichKeyPage = 0;
            this.refreshWhichKeyBindings();
        }
        this.state.setWhichKeyVisible(visible);
    }

    protected refreshWhichKeyBindings(): void {
        const context = this.resolveKeymapContext();
        const allBindings = Object.entries(this.globalKeymap!.effectiveBindings(context));
        const filtered = this.state.whichKeyFilterCustom
            ? allBindings.filter(([key]) => !(key in AGENT_CONSOLE_DEFAULT_KEYMAP) || AGENT_CONSOLE_DEFAULT_KEYMAP[key] === undefined)
            : allBindings;
        const pageSize = 25;
        const start = this.state.whichKeyPage * pageSize;
        const paged = filtered.slice(start, start + pageSize);
        this.state.setWhichKeyBindings(paged.map(([key, action]) => ({ key, action })));
    }

    protected async toggleHealthPopover(): Promise<void> {
        const visible = !this.state.healthPopoverVisible;
        if (visible) {
            this.state.setHealthItems(await this.collectHealthItems());
        }
        this.state.setHealthPopoverVisible(visible);
    }

    protected async collectHealthItems(): Promise<AgentConsoleHealthItem[]> {
        return collectHealthItems(this.appRpc, () => this.rpcRequestContext(), this.state, this.translator) as any;
    }

    protected canThreadNavigate(): boolean {
        return !!this.appRpc
            && this.state.focusLayers.hasMessageFocus()
            && !this.state.messageDetailOpen
            && !this.state.selectMenu;
    }

    protected canMessageNavigate(): boolean {
        return this.state.focusLayers.hasMessageFocus()
            && !this.state.messageDetailOpen
            && !this.state.selectMenu;
    }

    protected async navigateThreadChildFirst(): Promise<boolean> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            return false;
        }
        const children = await this.sessionService.getDelegationChildren(sessionId, {}, this.state);
        const first = children?.[0];
        if (!first?.childSessionId) {
            return false;
        }
        await this.openSession(String(first.childSessionId));
        return true;
    }

    protected async navigateThreadCycle(delta: 1 | -1): Promise<boolean> {
        return navigateThreadCycle(delta, this.sessionService, this.state, (sessionId: string) => this.openSession(sessionId));
    }

    protected async navigateThreadParent(): Promise<boolean> {
        const sessionId = this.state.sessionId;
        if (!sessionId || !this.sessionService) {
            return false;
        }
        const lineage = await this.sessionService.getDelegationLineage(sessionId, { limit: 1 }, this.state);
        const parentEdge = lineage?.[0];
        if (!parentEdge?.parentSessionId) {
            return false;
        }
        await this.openSession(String(parentEdge.parentSessionId));
        return true;
    }

    protected openCommandPalette(query = ''): void {
        openCommandPaletteView(terminalInputHost(this), query);
    }

    async handleTerminalInput(
        decoded: TerminalInputSequenceResult,
        chunk: ConsoleTextChunk
    ): Promise<void> {
        await handleTerminalInputView(terminalInputHost(this), decoded, chunk);
    }

    protected async requestTerminalExit(message?: string): Promise<void> {
        await requestTerminalExitView(terminalInputHost(this), message ?? this.closingSessionMessage());
    }

    protected closingSessionMessage(): string {
        return closingSessionMessageView(terminalInputHost(this));
    }
}
