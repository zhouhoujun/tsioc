import { formatAgentUiNotice } from './agent-ui.i18n';
import { applyMissingSessionNotice } from './AgentConsoleSessionOpen';
import { closeAgentConsoleSessionTab } from './AgentConsoleSessionTabClose';
import { applySecurityLevel } from './AgentConsolePolicyCommands';
import { policyCommandHost } from './AgentConsoleHostFactories';
import { promptModelUnavailable } from './AgentConsoleModelAvailability';
import { applyPersistedModelProfile } from './AgentConsoleSettingsStore';

/** Composition-root bootstrap boundary; all members are supplied by AgentConsoleComponent. */
export interface AgentConsoleBootstrapHost {
    [key: string]: any;
}

export async function bootstrapConsole(host: AgentConsoleBootstrapHost): Promise<void> {
        host.state.toolPayloadLoader = async (toolCallId: string) => { if (!host.appRpc) { return ''; } try { const res: any = await host.appRpc.request('session.tool_payload', { sessionId: host.state.sessionId, toolCallId }); return String(res?.text || ''); } catch { return ''; } };
        host.state.submitAction = host.submitActionHandler; host.state.escapeAction = () => host.handleWizardEscape();
        host.state.questionAction = host.appRpc
            ? async (input: any) => { await host.appRpc!.request('question.answer', input); }
            : undefined;
        host.state.queueDraftAction = () => host.queueDraft(); host.state.toggleHealthPopoverAction = () => host.toggleHealthPopover();
        host.state.copyFocusedTextAction = host.copyFocusedTextActionHandler;
        host.state.retryFailedEventAction = (message: any) => host.retryFailedEventHandler(message);
        host.state.activateSelectedSessionAction = host.activateSelectedSessionActionHandler;
        host.state.openSelectedTaskAction = host.openSelectedTaskActionHandler;
        host.state.cancelSelectedTaskAction = host.cancelSelectedTaskActionHandler;
        host.state.retrySelectedTaskAction = host.retrySelectedTaskActionHandler;
        host.state.retrySelectedPlanTodoAction = host.retrySelectedPlanTodoActionHandler;
        host.state.rollbackSelectedTaskAction = host.rollbackSelectedTaskActionHandler;
        host.state.toggleSelectedScheduledTaskAction = host.toggleSelectedScheduledTaskActionHandler;
        host.state.cancelSelectedScheduledTaskAction = host.cancelSelectedScheduledTaskActionHandler;
        host.state.recoverSelectedScheduledTaskAction = host.recoverSelectedScheduledTaskActionHandler;
        host.state.activateSelectedToolAction = host.activateSelectedToolActionHandler;
        host.state.revertGitSnapshotFromDetailAction = () => host.revertGitSnapshotFromDetail();
        host.state.resolveApprovalAction = host.resolveApprovalActionHandler; host.state.modelUnavailableAction = (failure: any) => promptModelUnavailable(host.modelCtx(), failure); host.state.scrollTranscriptAction = (rows: number) => host.surfaceAccessor?.scrollViewport?.(rows) ?? false; host.state.sessionTabsAction = { select: (id: string) => void host.openSession(id), create: () => void host.openSession(), close: (id: string) => { void closeAgentConsoleSessionTab({ state: host.state, translator: host.translator, isTurnInProgress: () => host.isTurnInProgress(), notifyBusyState: (message: string) => host.notifyBusyState(message), openSession: sessionId => host.openSession(sessionId) }, id).then(() => host.sessionUiState.forget(id)); } };
        host.state.approvalAlwaysAllowAction = async (requestId: string) => { (host.resolvedApprovalManager as any)?.setAutoApprove?.(true); await host.resolveApprovalActionHandler('approve', requestId); host.notify(formatAgentUiNotice(host.translator, 'approvalAlwaysAllowed')); };
        host.state.globalKeyInputAction = (key: string, modifiers: any) => host.handleBrowserGlobalKeyInput(key, modifiers);
host.state.onReviewAnnotationsPersist = (cache: any) => host.saveReviewAnnotationsCacheToDisk(cache);
        host.state.onReviewConclusionsWriteBack = (conclusions: any) => host.writeReviewConclusionsToMemory(conclusions);
        host.state.onSessionReconnected = () => host.restoreReviewAnnotationsCacheFromDisk();
        host.restoreReviewAnnotationsCacheFromDisk();
        host.ensureWorkspaceMentionResolver();
        await host.restoreGlobalKeymap();
        await host.restoreTheme();
        await host.restoreStatusline(); await host.restoreTitle();
        await host.restoreRawMode();
        await host.restoreModelStore();
        await host.restoreSettings();
        // `openSession` re-reads the runtime's state (app.state) and would
        // overwrite the profile restored above with the still-default runtime
        // profile. Capture the persisted choice before that round-trip and
        // re-apply it afterwards.
        const persistedModelProfile = String(host.state.modelProfile || '').trim();
        host.state.setTranscriptFollowProvider(() => host.surfaceAccessor?.isViewportFollowing?.() ?? true);
        host.updateTerminalTitle();
        await host.resolveGitBranch();
        // Do not ask app.state for an implicit session: that RPC creates and
        // tracks a session (and can replay its transcript through the bridge).
        // Startup session contract: only --session may resume.
        const explicitSessionId = String(host.options.bootstrapTurn?.sessionId || '').trim();
        const missingResume = await applyMissingSessionNotice(host.sessionOpenHost(), explicitSessionId);
        const freshStartup = !explicitSessionId
            && (host.options.bootstrapTurn?.enabled === false || !!host.startupWorkspace);
        if (!freshStartup) {
            await host.bootstrapStateFromAppRpc();
        }
        await host.initializeInputHistory();
        // No explicit session means a fresh conversation. Resuming the state
        // default here replays the previous transcript on every console start.
        await host.openSession(explicitSessionId || (freshStartup ? undefined : host.state.sessionId) || undefined, { persistCurrentHistory: false, fresh: freshStartup, missing: missingResume }); if (freshStartup) { await host.bootstrapStateFromAppRpc(host.state.sessionId); }
        const persistedProfileName = persistedModelProfile;
        const directProfile = persistedProfileName.includes('/');
        const profileExists = !!persistedProfileName && !!(host.options.model as any)?.profiles?.[persistedProfileName];
        if ((host.options.model as any)?.explicitModel) {
            host.state.setModelProfile('');
            host.updateTerminalTitle?.();
        } else if (directProfile && host.appRpc) {
            const profileApplied = applyPersistedModelProfile(host.options, persistedProfileName);
            if (!profileApplied) {
                host.state.setModelProfile('');
                host.updateTerminalTitle?.();
            } else {
                await host.activateModelProfile(persistedProfileName, undefined, true);
            }
        } else if (profileExists && host.appRpc) {
            await host.activateModelProfile(persistedProfileName, undefined, true);
        }
        if (host.state.securityLevel) {
            await applySecurityLevel(policyCommandHost(host), host.state.securityLevel, { notify: false, persist: false });
        }
        // Subscribe only after the initial session is selected. Subscribing
        // earlier lets the remote bridge seed the default session's timeline
        // into a new, non-resumed chat.
        host.bridge.bindState(host.sessionState);
        // Await remote seed/replay before declaring startup complete. Without
        // this, a fresh-session clear races async replay and old project
        // transcript can be appended after the clear.
        await Promise.resolve(host.bridge.subscribe());
        if (freshStartup) {
            // Local bridge subscription can synchronously project retained
            // host events, including a plan from a previous workspace session.
            // A plain workspace start owns a clean conversation unless the
            // caller explicitly supplied --session.
            host.state.setMessages([]);
            host.state.clearPlanTodos();
            host.state.setGoalSummary(null);
            host.state.clearActivities();
        }
        host.scheduleInputHistoryRestore();
        await host.refreshTools();
        await host.refreshMentionCatalog();
        await host.refreshScheduledTasks();
        await host.refreshUsageDigest();
        await host.refreshSummaryQualityDigest();
        await host.refreshCompactionDigest();
        await host.refreshTurnDiagnosticsDigest();
        host.state.setTasksCount(host.scheduler.getTasks().length);

}

export function disposeConsole(host: AgentConsoleBootstrapHost): void {
        host.destroyed = true;
        void host.stopVoiceCapture(true).catch(() => undefined);
        void Promise.resolve(host.audioPlayback?.stop()).catch(() => undefined);
        host.clearStreamingMessageState();
        host.clearInputHistoryRestoreTimers();
        host.state.copyFocusedTextAction = undefined;
        host.state.activateSelectedSessionAction = undefined;
        host.state.openSelectedTaskAction = undefined;
        host.state.cancelSelectedTaskAction = undefined;
        host.state.retrySelectedTaskAction = undefined;
        host.state.retrySelectedPlanTodoAction = undefined;
        host.state.rollbackSelectedTaskAction = undefined;
        host.state.toggleSelectedScheduledTaskAction = undefined;
        host.state.cancelSelectedScheduledTaskAction = undefined;
        host.state.recoverSelectedScheduledTaskAction = undefined;
        host.state.activateSelectedToolAction = undefined;
        host.state.resolveApprovalAction = undefined; host.state.approvalAlwaysAllowAction = undefined; host.state.modelUnavailableAction = undefined; host.state.scrollTranscriptAction = undefined; host.state.sessionTabsAction = undefined;
        host.state.globalKeyInputAction = undefined;
        void host.persistInputHistory(); void host.persistSettings({ lastSessionId: host.state.sessionId, openSessionIds: host.state.openSessionIds });
        const shell = host.sshShell;
        host.sshShell = null;
        host.state.sshShell = null;
        if (shell) {
            void shell.close().catch(() => void 0);
        }
        host.dispose();

}
