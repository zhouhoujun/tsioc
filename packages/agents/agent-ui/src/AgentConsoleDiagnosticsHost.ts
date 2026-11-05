import type { TranslatorService } from '@tsdi/i18n';
import type { ApplicationContext } from '@tsdi/core';
import { FileAdapter } from '@tsdi/common';
import type { AgentTurnMessageInput } from '@tsdi/agent';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import type { AgentConsoleSessionService } from './AgentConsoleSessionService';
import type { AgentConsolePendingAttachment } from './AgentConsoleSessionState';
import type { HarnessCommandHost } from './AgentConsoleHarnessCommands';
import type { VoiceHandlerContext } from './AgentConsoleVoiceHandlers';
import {
    openSummaryQualityRecords,
    openTurnDiagnosticsListView,
    openTurnDiagnosticsTrendView,
    openSummaryQualityTrendView,
    runHarnessStopCommand
} from './AgentConsoleDiagnosticsView';
import {
    openCompactionHistory,
    openCompactionHistoryTrend,
    openTurnDiagnostics as openTurnDiagnosticsFn,
    openUsage,
    openHarnessAudit,
    openHarnessProfile
} from './AgentConsoleDiagnosticsHandlers';
import {
    runExportCommand as runExportCommandFn,
    runAttachCommand as runAttachCommandFn
} from './AgentConsoleExportHandlers';
import {
    openHarnessListView,
    openHarnessTreeView,
    openDelegationLineageView,
    openDelegationListView,
    openDelegationTreeView
} from './AgentConsoleHarnessCommands';
import {
    decodeVoiceAudioChunk,
    handleVoiceCommand,
    playVoiceReply,
    startVoiceCapture,
    stopVoiceCapture
} from './AgentConsoleVoiceHandlers';
import { buildTurnMessageInput } from './AgentConsoleExportHandlers';
import { AgentConsoleProjectHost } from './AgentConsoleProjectHost';

/** Diagnostics, harness, export and voice command projections for the console facade. */
export abstract class AgentConsoleDiagnosticsHost extends AgentConsoleProjectHost {
    protected abstract app?: ApplicationContext | null;
    protected abstract translator?: TranslatorService;
    protected abstract notify(message: string, duration?: number): void;
    protected abstract select(title: string, options: any[], selectedIndex?: number, hint?: string): Promise<string | undefined>;
    protected abstract pushCommandOutput(command: string, text: string, kind?: any): void;
    protected abstract parseCompactionHistoryTrendArgs(args: string): { sessionId?: string; bucketSize?: number; maxBuckets?: number };
    protected abstract getExportHandlerContext(): any;
    protected abstract getDiagnosticsHandlerContext(): any;
    protected abstract harnessCommandHost(): HarnessCommandHost;
    protected abstract voiceCtx(): VoiceHandlerContext;

    protected async openSummaryQualityRecords(provider?: string): Promise<boolean> {
        return openSummaryQualityRecords(
            this.sessionService,
            (message: string) => this.notify(message),
            (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            provider, this.translator
        );
    }

    protected async openSummaryQualityTrend(
        provider?: string,
        bucketSize?: number,
        maxBuckets?: number
    ): Promise<boolean> {
        return openSummaryQualityTrendView(
            this.sessionService,
            (message: string) => this.notify(message),
            (command: string, text: string) => this.pushCommandOutput(command, text),
            provider,
            bucketSize,
            maxBuckets, this.translator
        );
    }

    protected async runExportCommand(args: string): Promise<boolean> {
        return runExportCommandFn(this.getExportHandlerContext(), args);
    }

    protected resolveFileAdapter(): FileAdapter | null {
        return this.app?.get(FileAdapter, null) as FileAdapter | null;
    }

    protected buildTurnMessageInput(prompt: string, attachments: AgentConsolePendingAttachment[]): AgentTurnMessageInput | undefined {
        return buildTurnMessageInput(prompt, attachments);
    }

    protected async runAttachCommand(args: string): Promise<boolean> {
        return runAttachCommandFn(this.getExportHandlerContext(), args);
    }

    protected async openCompactionHistory(args: string): Promise<boolean> {
        return openCompactionHistory(this.getDiagnosticsHandlerContext(), args);
    }

    protected async openCompactionHistoryTrend(
        sessionId?: string,
        bucketSize?: number,
        maxBuckets?: number
    ): Promise<boolean> {
        const args = [sessionId, bucketSize, maxBuckets].filter(v => v != null).join(' ');
        return openCompactionHistoryTrend(this.getDiagnosticsHandlerContext(), args);
    }

    protected async openTurnDiagnostics(sessionId?: string): Promise<boolean> {
        return openTurnDiagnosticsFn(this.getDiagnosticsHandlerContext(), sessionId);
    }

    protected async openUsage(input?: string): Promise<boolean> {
        return openUsage(this.getDiagnosticsHandlerContext(), input);
    }

    protected async openHarnessAudit(sessionId?: string): Promise<boolean> {
        return openHarnessAudit(this.getDiagnosticsHandlerContext(), sessionId);
    }

    protected async openHarnessProfile(sub?: string): Promise<boolean> {
        return openHarnessProfile(this.getDiagnosticsHandlerContext(), sub);
    }

    protected async openHarnessTree(sessionId?: string): Promise<boolean> {
        return openHarnessTreeView(this.harnessCommandHost(), sessionId);
    }

    protected async openHarnessList(sessionId?: string): Promise<boolean> {
        return openHarnessListView(this.harnessCommandHost(), sessionId);
    }

    /**
     * Handles `/harness stop <taskId>`: cancels the referenced background task
     * over RPC and reports the outcome inline.
     */
    protected async runHarnessStopCommand(taskId: string): Promise<boolean> {
        return runHarnessStopCommand(this.sessionService, (message: string) => this.notify(message), taskId, this.translator);
    }

    protected async handleVoiceCommand(arg: string): Promise<boolean> {
        return handleVoiceCommand(this.voiceCtx(), arg);
    }

    protected async startVoiceCapture(sessionId: string): Promise<string | undefined> {
        return startVoiceCapture(this.voiceCtx(), sessionId);
    }

    protected async stopVoiceCapture(cancel: boolean): Promise<void> {
        return stopVoiceCapture(this.voiceCtx(), cancel);
    }

    protected async playVoiceReply(result: Record<string, any>): Promise<string | undefined> {
        return playVoiceReply(this.voiceCtx(), result);
    }

    protected decodeVoiceAudioChunk(value: string): Uint8Array {
        return decodeVoiceAudioChunk(value);
    }

    /**
     * Opens `/diagnostics list [sessionId]`: browses recorded turn diagnostics
     * records for the given session (or all owned sessions when omitted) as a
     * selectable list.
     */
    protected async openTurnDiagnosticsList(sessionId?: string): Promise<boolean> {
        return openTurnDiagnosticsListView(
            this.sessionService,
            (message: string) => this.notify(message),
            (title: string, options: any[], index: number, hint?: string) => this.select(title, options, index, hint),
            sessionId,
            this.state.sessionId, this.translator
        );
    }

    /**
     * Opens `/diagnostics trend [sessionId] [bucketSize] [maxBuckets]`:
     * renders one sparkline line per session showing how token savings and
     * compaction activity evolve over time buckets.
     */
    protected async openTurnDiagnosticsTrend(
        sessionId?: string,
        bucketSize?: number,
        maxBuckets?: number
    ): Promise<boolean> {
        return openTurnDiagnosticsTrendView(
            this.sessionService,
            (message: string) => this.notify(message),
            (command: string, text: string) => this.pushCommandOutput(command, text),
            sessionId,
            bucketSize,
            maxBuckets, this.translator
        );
    }

    /**
     * Opens `/delegation tree [sessionId] [status] [depth]`: renders the
     * persisted parent → child session tree rooted at the current (or given)
     * session as an indented tree with edge kind/status/timestamps inline.
     */
    protected async openDelegationTree(sessionId?: string, status?: string, depth?: number): Promise<boolean> {
        return openDelegationTreeView(this.harnessCommandHost(), sessionId, status, depth);
    }

    /**
     * Opens `/delegation lineage [sessionId]`: renders the persisted chain of
     * parent sessions above the current (or given) session, closest first.
     */
    protected async openDelegationLineage(sessionId?: string): Promise<boolean> {
        return openDelegationLineageView(this.harnessCommandHost(), sessionId);
    }

    /**
     * Opens `/delegation [list] [sessionId]`: lists flat delegation edges
     * touching the current (or given) session, newest edges first, as one
     * digest line per edge.
     */
    protected async openDelegationList(sessionId?: string): Promise<boolean> {
        return openDelegationListView(this.harnessCommandHost(), sessionId);
    }

    /**
     * Parses `/diagnostics trend` trailing tokens: optional session id,
     * optional bucket size (`Nd` for days or a millisecond number), optional
     * max bucket count. Reuses the same token grammar as the compaction trend.
     */
    protected parseTurnDiagnosticsTrendArgs(
        args: string
    ): { sessionId?: string; bucketSize?: number; maxBuckets?: number } {
        return this.parseCompactionHistoryTrendArgs(args);
    }
}
