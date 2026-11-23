import type { ApplicationContext, UuidGenerator } from '@tsdi/core';
import type { AgentTelemetry } from '../harness/AgentTelemetry';
import type { EvidenceLedger } from '../harness/EvidenceLedger';
import type { CompactionHistoryStore, CompactionHistoryRecord } from '../harness/CompactionHistoryStore';
import type { TurnDiagnosticsStore } from '../harness/TurnDiagnosticsStore';
import type { ContextPreparationReport } from '../context/AgentContextManager';
import { AgentTurnDiagnostics, AgentTurnDiagnosticsEvent } from './AgentEvents';

interface RecoverySnapshot {
    attemptHistory: Array<{ signatures: string[] }>;
    repairRecipes: Array<{ signature: string; fixes: Array<{ toolName: string; inputSummary?: string }> }>;
    terminated?: boolean;
}

export interface TurnObservabilityHost {
    app: ApplicationContext;
    uuid: UuidGenerator;
    telemetry?: AgentTelemetry;
    turnDiagnosticsStore?: TurnDiagnosticsStore;
    compactionHistoryStore?: CompactionHistoryStore;
}

/** Turn diagnostics/compaction persistence and event publication. */
export class TurnObservabilityController {
    constructor(private readonly host: TurnObservabilityHost) {
    }

    async publishTurnDiagnostics(source: object, sessionId: string, diagnostics?: AgentTurnDiagnostics): Promise<void> {
        if (!diagnostics) {
            return;
        }
        try {
            await this.host.app.publishEvent(new AgentTurnDiagnosticsEvent(source, sessionId, { ...diagnostics }));
        } catch {
            // diagnostics observability must not break turn execution
        }
    }

    async recordTurnDiagnostics(
        sessionId: string,
        diagnostics?: AgentTurnDiagnostics,
        evidenceLedger?: EvidenceLedger,
        recovery?: RecoverySnapshot,
        workspace?: string
    ): Promise<void> {
        if (!this.host.turnDiagnosticsStore || !diagnostics) {
            return;
        }
        const falsifiedSignatures = [...new Set(recovery?.attemptHistory.flatMap(attempt => attempt.signatures) ?? [])];
        const repairRecipes = recovery?.repairRecipes ?? [];
        const metadata: Record<string, any> = {
            loopRecoveryCount: diagnostics.loopRecoveryCount ?? 0,
            falsificationCount: diagnostics.falsificationCount ?? 0,
            repairRoundsUsed: diagnostics.repairRoundsUsed ?? 0,
            repeatedAttemptCount: diagnostics.repeatedAttemptCount ?? 0,
            replayCount: diagnostics.replayCount ?? 0,
            replayKind: diagnostics.replayKind,
            repairResolved: falsifiedSignatures.length > 0 && !recovery?.terminated,
            falsifiedSignatures
        };
        if (repairRecipes.length > 0) {
            metadata.repairRecipes = repairRecipes;
        }
        const record = {
            id: this.host.uuid.generate(),
            sessionId,
            workspaceId: workspace,
            createdAt: Date.now(),
            emptyResponseRetryCount: diagnostics.emptyResponseRetryCount,
            followUpRecoveryCount: diagnostics.followUpRecoveryCount,
            followUpContextRewritten: diagnostics.followUpContextRewritten,
            finalAssistantWasClarification: diagnostics.finalAssistantWasClarification,
            repeatedClarificationDetected: diagnostics.repeatedClarificationDetected,
            compactionCount: diagnostics.compactionCount,
            totalTokenSavings: diagnostics.totalTokenSavings,
            compressionRatio: diagnostics.compressionRatio,
            compactionLevel: diagnostics.compactionLevel,
            promptCache: diagnostics.promptCache,
            evidence: evidenceLedger?.snapshot(),
            metadata
        };
        try {
            await this.host.turnDiagnosticsStore.append(record);
        } catch {
            // turn diagnostics persistence must not break turn execution
        }
    }

    async recordCompactionHistory(sessionId: string, report: ContextPreparationReport): Promise<void> {
        if (!this.host.compactionHistoryStore) {
            return;
        }
        const modified = report.strategy !== 'unchanged' || report.toolMessagesCompacted > 0;
        if (!modified) {
            return;
        }
        this.host.telemetry?.startSpan('agent.compaction', { level: report.level, strategy: report.strategy }).end('ok');
        const record: CompactionHistoryRecord = {
            id: this.host.uuid.generate(),
            sessionId,
            strategy: report.strategy,
            compactionTriggered: report.compactionTriggered,
            level: report.level,
            summaryInserted: report.summaryInserted,
            beforeMessageCount: report.beforeMessageCount,
            afterMessageCount: report.afterMessageCount,
            beforeTokens: report.beforeTokens,
            afterTokens: report.afterTokens,
            compactedMessageCount: report.compactedMessageCount,
            preservedAnchorCount: report.preservedAnchorCount,
            recentMessageCount: report.recentMessageCount,
            prunedMessageCount: report.prunedMessageCount,
            toolMessagesCompacted: report.toolMessagesCompacted,
            compressionRatio: report.compressionRatio,
            cumulativeTokenSavings: report.cumulativeTokenSavings,
            replayed: report.replayed,
            replayKind: report.replayKind,
            createdAt: Date.now()
        };
        try {
            await this.host.compactionHistoryStore.append(record);
        } catch {
            // compaction history persistence must not break turn execution
        }
    }
}
