import type { AgentMessage, AgentTurnMessageInput } from '@tsdi/agent';
import type { AgentConsoleActivity, AgentConsolePendingAttachment } from './AgentConsoleSessionState';
import { presentModelFailure } from './AgentConsoleModelFailurePresenter';

/**
 * Host surface required by the turn input controller.
 * The component satisfies this interface structurally when delegating.
 */
export interface AgentConsoleTurnInputHost {
    state: {
        input: string;
        sessionId: string;
        status: string;
        messages: AgentMessage[];
        pendingAttachments: AgentConsolePendingAttachment[];
        providerWizard?: { open?: boolean; phase?: string } | null;
        setInput(value: string, cursor?: number): void;
        inputHistoryController: { push(value: string): void };
        setStatus(status: string): void;
        setLastError(message: string): void;
        clearPendingAttachments(): void;
        clearActivities(): void;
        pushActivity(kind: AgentConsoleActivity['kind'], message: string): void;
        summarize(value: string): string;
        setMessages(messages: AgentMessage[], preserveCommandExecutionMessages?: boolean): void;
        resetTurnTokenUsage(): void;
        beginTurnEventScope(scope?: string): string;
        clearTurnEventScope(scope?: string): void;
        appendAssistantErrorMessage(message: string): void;
        setTasksCount(value: number): void;
    };
    draftLines: string[];
    multilineMode: boolean;
    shellMultilineMode: boolean;
    shellDraftLines: string[];
    editTargetMessageId: string;
    lastEditSessionMessageId: string;
    editDismissedAt: number;
    activeTurnRun?: Promise<void> | null;
    sessionService?: {
        forkSession(sessionId: string, messageId?: string): Promise<string>;
        ensureSession(): Promise<{ id?: string } | undefined>;
    } | null;
    scheduler: { getTasks(): unknown[] };
    isTurnInProgress(): boolean;
    notifyBusyState(message?: string): void;
    enrichPromptWithMentions(input: string): Promise<string>;
    buildTurnMessageInput(prompt: string, attachments: AgentConsolePendingAttachment[]): AgentTurnMessageInput | undefined;
    consumePendingTurnModelProfile(): string | undefined;
    persistInputHistory(): Promise<void>;
    clearStreamingMessageState(): void;
    updateTerminalTitle(): void;
    runTurnStream(prompt: string, assistantMessage: AgentMessage, message?: AgentTurnMessageInput, profile?: string): Promise<void>;
    ensureMessageAtTail(messageId: string): void;
    advanceProviderWizard(value: string): Promise<void>;
    notify(message: string, duration?: number): void;
    handleShellBang(value: string): Promise<boolean>;
    handleCommand(value: string): Promise<boolean>;
    interruptTurn(): Promise<void>;
    isSteerModeEnabled(): boolean;
    isQueueModeEnabled(): boolean;
    enqueuePrompt(input: string): void;
    openSession(sessionId?: string, options?: { persistCurrentHistory?: boolean; fresh?: boolean }): Promise<void>;
    resolveMentionDisplayFiles(input: string): string[];
    refreshTurnArtifacts(): Promise<void>;
    drainQueuedPrompts(sessionId: string): Promise<void>;
    translate?: (key: string, params?: Record<string, any>) => string | undefined;
}

/**
 * Submits the accumulated multiline draft as one turn, reusing the same
 * turn-lifecycle machinery as {@link submitView}.
 */
export async function submitMultilineDraftView(host: AgentConsoleTurnInputHost): Promise<void> {
        if (!host.draftLines.length) { return; }
        if (host.isTurnInProgress()) {
            host.notifyBusyState();
            return;
        }
        const draft = host.draftLines.join('\n');
        const prompt = await host.enrichPromptWithMentions(draft);
        const attachments = host.state.pendingAttachments.slice();
        const turnMessage = host.buildTurnMessageInput(prompt, attachments);
        const profile = host.consumePendingTurnModelProfile();
        host.draftLines = [];
        host.multilineMode = false;
        host.state.inputHistoryController.push(draft);
        await host.persistInputHistory();
        host.clearStreamingMessageState();
        const turnScope = host.state.beginTurnEventScope();
        const userMsg: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            parts: turnMessage?.parts,
            createdAt: Date.now()
        };
        const asstMsg: AgentMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            metadata: { streaming: true }
        };
            const baseMessages = host.state.messages.slice();
            host.state.setInput('');
            host.state.setStatus('running');
            host.state.setLastError('');
            host.state.clearPendingAttachments();
            host.state.clearActivities();
            host.state.pushActivity('turn', host.state.summarize(draft));
            host.state.setMessages([...baseMessages, userMsg, asstMsg]);
            host.updateTerminalTitle();
        try {
            await host.runTurnStream(prompt, asstMsg, turnMessage, profile);
            host.clearStreamingMessageState();
            host.ensureMessageAtTail(asstMsg.id);
                if (host.state.status === 'running' || host.state.status === 'reasoning') {
                    host.state.setStatus('idle');
                    host.updateTerminalTitle();
                }
        } catch (error: any) {
            // `error.message` alone drops the ModelFailure remedy hint and leaks the
            // raw provider string, so route model failures through the presenter.
            const message = presentModelFailure(error, host.translate) ?? (error.message || 'Unknown');
            host.clearStreamingMessageState();
                host.state.setStatus('error');
                host.state.setLastError(message);
                host.state.pushActivity('error', message);
                host.state.appendAssistantErrorMessage(message);
                host.updateTerminalTitle();
        } finally {
            host.state.clearTurnEventScope(turnScope);
        }
    }

/**
 * Submits the current composer input as a turn, handling provider wizard,
 * edit-branching, queue/steer modes, multiline drafts and shell drafts
 * before delegating to the turn stream run loop.
 */
export async function submitView(host: AgentConsoleTurnInputHost): Promise<void> {
        const value = host.state.input.trim();
        if (!value) { return; }
        if (host.state.providerWizard?.open && host.state.providerWizard?.phase === 'enter') {
            await host.advanceProviderWizard(value);
            return;
        }
        const editTargetId = host.editTargetMessageId;
        const editConsumed = !!editTargetId;
        if (editTargetId) {
            host.editTargetMessageId = '';
            host.lastEditSessionMessageId = '';
            host.editDismissedAt = 0;
        }
        if (host.shellMultilineMode && !editConsumed && !value.startsWith('!') && !value.startsWith('/')) {
            host.state.inputHistoryController.push(value);
            const persistHistory = host.persistInputHistory();
            host.state.setInput('');
            host.shellDraftLines.push(value);
            await persistHistory;
            host.notify(`Shell draft +${host.shellDraftLines.length} line(s). Submit with '!' alone, exit with '!!'.`);
            return;
        }
        if (value.startsWith('!')) {
            host.state.inputHistoryController.push(value);
            const persistHistory = host.persistInputHistory();
            host.state.setInput('');
            if (await host.handleShellBang(value)) {
                await persistHistory;
                return;
            }
            await persistHistory;
            host.state.setInput(value, value.length);
            return;
        }
        if (value.startsWith('/')) {
            host.state.inputHistoryController.push(value);
            const persistHistory = host.persistInputHistory();
            host.state.setInput('');
            if (await host.handleCommand(value)) {
                await persistHistory;
                return;
            }
            await persistHistory;
            host.state.setInput(value, value.length);
        }
        let steer = false;
        if (host.isTurnInProgress()) {
            if (host.isSteerModeEnabled() && !host.multilineMode) {
                // P128 steer: awaiting the in-flight stream settles microtask
                // order so the old submit's finally (status reset) runs first.
                steer = true;
                await host.interruptTurn();
                if (host.activeTurnRun) await host.activeTurnRun.catch(() => undefined);
        } else if (host.isQueueModeEnabled()) {
            host.enqueuePrompt(value);
            return;
        } else {
            host.notifyBusyState();
            return;
        }
    }
        if (editConsumed && !value.startsWith('/') && !value.startsWith('!') && host.state.sessionId) {
            const messages = host.state.messages.slice();
            const editedIndex = messages.findIndex(message => message.id === editTargetId);
            const hasLaterTurns = editedIndex >= 0 && editedIndex < messages.length - 1;
            if (hasLaterTurns) {
                const source = host.state.sessionId;
                let branchId = '';
                if (editedIndex > 0) {
                    branchId = await host.sessionService?.forkSession(source, messages[editedIndex - 1].id) || '';
                } else {
                    const fresh = await host.sessionService?.ensureSession();
                    branchId = fresh?.id || '';
                }
                if (branchId && branchId !== source) {
                    await host.openSession(branchId);
                    host.notify(`Branched into ${branchId} with your edited prompt (original preserved).`);
                }
            }
        }
        const turnSessionId = host.state.sessionId;
        if (!steer) {
            host.state.inputHistoryController.push(value);
            await host.persistInputHistory();
        }
        if (host.multilineMode) {
            host.draftLines.push(value);
            return;
        }
        const prompt = await host.enrichPromptWithMentions(value);
        const attachments = host.state.pendingAttachments.slice();
        const turnMessage = host.buildTurnMessageInput(prompt, attachments);
        const profile = host.consumePendingTurnModelProfile();
        host.clearStreamingMessageState();
        const turnScope = host.state.beginTurnEventScope();
        const mentionFiles = host.resolveMentionDisplayFiles(value);
        const userMetadata: Record<string, any> = {};
        if (steer) {
            userMetadata.kind = 'steer';
        }
        if (mentionFiles.length) {
            userMetadata.mentionFiles = mentionFiles;
        }
        const userMessage: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            parts: turnMessage?.parts,
            createdAt: Date.now(),
            ...(Object.keys(userMetadata).length ? { metadata: userMetadata } : {})
        };
        const assistantMessage: AgentMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: Date.now(),
            metadata: { streaming: true }
        };
            const baseMessages = host.state.messages.slice();
            host.state.setInput('');
            host.state.setStatus('running');
            host.state.setLastError('');
            host.state.clearPendingAttachments();
            host.state.clearActivities();
            host.state.pushActivity('turn', host.state.summarize(value));
            host.state.setMessages([...baseMessages, userMessage, assistantMessage]);
            host.state.resetTurnTokenUsage();
            host.updateTerminalTitle();

        try {
            const turnRun = host.runTurnStream(prompt, assistantMessage, turnMessage, profile);
            host.activeTurnRun = turnRun;
            await turnRun;
        } catch (error: any) {
            const message = presentModelFailure(error, host.translate) ?? (error?.message || String(error || 'Unknown error'));
                host.state.setStatus('error');
                host.state.setLastError(message);
                host.state.pushActivity('error', message);
                host.state.appendAssistantErrorMessage(message);
                host.updateTerminalTitle();
        } finally {
            host.activeTurnRun = null;
            host.ensureMessageAtTail(assistantMessage.id);
                if (host.state.status === 'running' || host.state.status === 'reasoning') {
                    host.state.setStatus('idle');
                    host.updateTerminalTitle();
                }
                host.state.setTasksCount(host.scheduler.getTasks().length);
            void host.refreshTurnArtifacts();
            host.state.clearTurnEventScope(turnScope);
            void host.drainQueuedPrompts(turnSessionId);
        }
    }
