import type { ExportHandlerContext } from './AgentConsoleExportHandlers';
import type { DiagnosticsHandlerContext } from './AgentConsoleDiagnosticsHandlers';
import type { HarnessCommandHost } from './AgentConsoleHarnessCommands';
import type { VoiceHandlerContext } from './AgentConsoleVoiceHandlers';
import type { ReviewHandlerContext } from './AgentConsoleReviewHandlers';
import type { CodingTaskHandlerContext } from './AgentConsoleCodingTaskHandlers';
import type { EditModeHandlerContext } from './AgentConsoleEditModeHandlers';
import type { ModelHandlerContext } from './AgentConsoleModelHandlers';
import type { AgentConsoleSshHost } from './AgentConsoleSshCommands';
import type { AgentConsoleCommandOutputEntry } from './AgentConsoleSessionState';
import { extractEditableMessageText, getEditableImageParts, getEditableUserMessages } from './AgentConsoleEditModeHandlers';

export function getExportHandlerContext(self: any) {
        return {
            state: self.state,
            sessionService: self.sessionService!,
            app: self.app!,
            workspace: self.workspace,
            notify: (msg: string) => self.notify(msg), translator: self.translator,
        };
    }

export function getDiagnosticsHandlerContext(self: any) {
        return {
            state: self.state,
            sessionService: self.sessionService!,
            notify: (msg: string) => self.notify(msg), translator: self.translator,
            pushCommandOutput: (command: string, text: string, kind?: AgentConsoleCommandOutputEntry['kind']) => self.pushCommandOutput(command, text, kind),
            select: (title: string, options: any[], footer?: string) => self.select(title, options, 0, footer),
        };
    }

export function harnessCommandHost(self: any): HarnessCommandHost {
        return {
            sessionService: self.sessionService ?? null,
            state: self.state,
            notify: message => self.notify(message), translator: self.translator,
            pushCommandOutput: (command, text) => self.pushCommandOutput(command, text)
        };
    }

export function voiceCtx(self: any): VoiceHandlerContext {
        return {
            state: self.state,
            sessionService: self.sessionService,
            audioCapture: self.audioCapture,
            audioPlayback: self.audioPlayback,
            notify: (message, duration) => self.notify(message, duration), translator: self.translator,
            pushCommandOutput: (command, text, kind) => self.pushCommandOutput(command, text, kind),
            getCaptureSessionId: () => self.voiceCaptureSessionId,
            setCaptureSessionId: value => { self.voiceCaptureSessionId = value; },
            getCaptureFeed: () => self.voiceCaptureFeed,
            setCaptureFeed: feed => { self.voiceCaptureFeed = feed; }
        };
    }

export function reviewCtx(self: any): ReviewHandlerContext {
        return {
            state: self.state,
            transcriptNavigationController: self.transcriptNavigationController,
            appRpc: self.appRpc,
            notify: (message, duration) => self.notify(message, duration), translator: self.translator,
            activateToolForSession: (toolName, sessionId) => self.activateToolForSession(toolName, sessionId),
            getOpenReviewRequestId: () => self.openReviewRequestId
        };
    }

export function codingTaskCtx(self: any): CodingTaskHandlerContext {
        return {
            state: self.state,
            transcriptNavigationController: self.transcriptNavigationController,
            appRpc: self.appRpc,
            scheduler: self.scheduler,
            notify: (message, duration) => self.notify(message, duration), translator: self.translator,
            select: (title, options, selectedIndex, hint) => self.select(title, options, selectedIndex, hint),
            getTaskViewContextVersion: () => self.taskViewContextVersion,
            bumpTaskViewContextVersion: () => ++self.taskViewContextVersion,
            getOpenReviewRequestId: () => self.openReviewRequestId,
            bumpOpenReviewRequestId: () => ++self.openReviewRequestId,
            resolveProjectSessionIdsFor: (sessionId) => self.resolveProjectSessionIdsFor(sessionId),
            resolveThreadSessionIdsFor: (sessionId) => self.resolveThreadSessionIdsFor(sessionId),
            restoreReviewAnnotationsCacheFromDiskForScope: (scope) => self.restoreReviewAnnotationsCacheFromDiskForScope(scope)
        };
    }

export function editCtx(self: any): EditModeHandlerContext {
        return {
            state: self.state,
            notify: (message, duration) => self.notify(message, duration), translator: self.translator,
            editEscapeWindowMs: self.state.consoleOptions.editEscapeWindowMs,
            getEditableUserMessages: () => getEditableUserMessages(self.state.messages),
            extractEditableMessageText: target => extractEditableMessageText(target),
            getEditableImageParts: target => getEditableImageParts(target),
            getTargetMessageId: () => self.editTargetMessageId,
            setTargetMessageId: value => { self.editTargetMessageId = value; },
            getLastSessionMessageId: () => self.lastEditSessionMessageId,
            setLastSessionMessageId: value => { self.lastEditSessionMessageId = value; },
            getDismissedAt: () => self.editDismissedAt,
            setDismissedAt: value => { self.editDismissedAt = value; },
            getDraftBefore: () => self.editDraftBefore,
            setDraftBefore: value => { self.editDraftBefore = value; },
            getAttachmentsBefore: () => self.editAttachmentsBefore,
            setAttachmentsBefore: value => { self.editAttachmentsBefore = value; },
            getLastEscapeAt: () => self.lastEscapeAt,
            setLastEscapeAt: value => { self.lastEscapeAt = value; },
        };
    }

export function modelCtx(self: any): ModelHandlerContext {
        return {
            state: self.state,
            appRpc: self.appRpc,
            options: () => self.options,
            modelStore: self.modelStore,
            notify: (message, duration) => self.notify(message, duration), translator: self.translator,
            select: (title, options, selectedIndex, hint) => self.select(title, options, selectedIndex, hint),
            updateTerminalTitle: () => self.updateTerminalTitle(),
            persistSettings: async patch => { await self.appRpc?.request('settings.ui.set', patch).catch(() => undefined); await self.persistSettings(patch); },
            addModelProvider: () => self.startProviderWizard(), activateModelProfile: (name, effort, silent) => self.activateModelProfile(name, effort, silent), updateModelOptions: model => self.runtime.updateModelOptions?.(model),
            resolveHistoryWorkspace: () => self.resolveHistoryWorkspace(),
            getFavorites: () => self.modelFavorites,
            setFavorites: value => { self.modelFavorites = value; },
            getRecents: () => self.modelRecents,
            setRecents: value => { self.modelRecents = value; },
            getReasoningEffort: () => self.modelReasoningEffort,
            setReasoningEffort: value => { self.modelReasoningEffort = value; },
            nextActivateRequestId: () => ++self.activateModelRequestId,
            peekActivateRequestId: () => self.activateModelRequestId
        };
    }

export function sshHost(self: any): AgentConsoleSshHost {
            return {
            translator: self.translator,
            state: self.state,
            get sshManager() { return self.sshManager; },
            get sshShell() { return self.sshShell; },
            set sshShell(value) { self.sshShell = value; },
            surface: self.surfaceAccessor,
            notify: (message, duration) => self.notify(message, duration)
        };
    }

export function pwctx(self: any): import('./AgentConsoleProviderWizardFlow').ProviderWizardContext {
        return {
            state: self.state,
            appRpc: self.appRpc,
            uiConfig: self.uiConfig,
            options: self.options,
            notify: (message: string) => self.notify(message), translator: self.translator,
            notifyBusyState: () => self.notifyBusyState(),
            isTurnInProgress: () => self.isTurnInProgress(),
            rpcRequestContext: () => self.rpcRequestContext(),
            activateModelProfile: (profile: string) => self.activateModelProfile(profile)
        };
    }
