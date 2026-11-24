import type { AgentOptions } from '../options';
import type { AgentToolDefinition } from '../tools/AgentTool';
import type { FileSnapshot } from '../harness/FileSnapshotStore';
import type { TurnRecoveryState, TurnRepairRecipe } from './TurnRecoveryState';
import type { TurnDiagnosticsStore } from '../harness/TurnDiagnosticsStore';
import { VerificationGate } from '../harness/VerificationGate';
import { VerifyCommandRunner, recordVerifyCommandEvidence, DEFAULT_VERIFY_TIMEOUT_MS } from '../harness/VerifyCommandRunner';
import { buildAttemptSignature, collectResolvedRepairHints, FalsificationAttempt, ResolvedRepairHint } from '../harness/RepairExploration';
import { ToolEvidenceEntry } from '../harness/EvidenceLedger';
import { TURN_DIAGNOSTICS_LIMIT } from '../AgentLimits';

export interface VerificationHost {
    options: AgentOptions;
    turnDiagnosticsStore?: TurnDiagnosticsStore;
    signal(sessionId: string): AbortSignal | undefined;
    readFileText(path: string): Promise<string | null>;
    resolveWriteTools(): string[];
    hasUnfinishedPlan(sessionId: string, context: any): boolean;
    falsificationSummary(recovery: TurnRecoveryState): string;
}

/** Verification gate, verify commands, repair recipes and write-falsification hints. */
export class VerificationController {
    constructor(private readonly host: VerificationHost) {
    }

    async runGate(sessionId: string, context: any, startIndex: number, maxRepairRounds: number): Promise<void> {
        const recovery: TurnRecoveryState | undefined = context.recovery;
        if (!recovery) return;
        const editedFiles = recovery.editedFiles;
        await this.runCommands(sessionId, context);
        const writeTools = this.host.resolveWriteTools();
        const gate = new VerificationGate({ writeTools });
        const result = gate.verify(context.evidenceLedger, startIndex, recovery.writeHints, editedFiles);
        recovery.writeHints = [];
        const roundEntries = context.evidenceLedger?.entriesFrom(startIndex) ?? [];
        const falsifiedIds = new Set(result.falsifiedEvidence.map((entry: any) => entry.id).filter(Boolean));
        const goodEntries = roundEntries.filter((entry: any) => !falsifiedIds.has(entry.id));
        if (recovery.attemptHistory.length > 0 && recovery.consecutiveFalsifications > 0 && goodEntries.length > 0) {
            const covered = new Set(recovery.repairRecipes.map(recipe => recipe.signature));
            for (const recipe of this.buildRepairRecipes(recovery.attemptHistory, goodEntries)) {
                if (!covered.has(recipe.signature)) {
                    recovery.repairRecipes.push(recipe);
                    covered.add(recipe.signature);
                }
            }
        }
        if (!result.falsified) {
            recovery.consecutiveFalsifications = 0;
            return;
        }
        const entryIds = result.falsifiedEvidence.map((entry: any) => entry.id).filter(Boolean);
        if (entryIds.length) {
            context.evidenceLedger?.markFalsified(entryIds, result.reasons.join('; '));
        }
        recovery.falsifiedEvidence = result.falsifiedEvidence;
        recovery.consecutiveFalsifications++;
        recovery.totalFalsifications++;
        recovery.repairPending = true;
        const signatures = result.falsifiedEvidence.map((entry: any) => buildAttemptSignature(entry.toolName, entry.inputSummary));
        const knownSignatures = new Set(recovery.attemptHistory.flatMap(attempt => attempt.signatures));
        recovery.repeatAttempts += signatures.filter(signature => knownSignatures.has(signature)).length;
        recovery.attemptHistory.push({
            round: recovery.totalFalsifications,
            entries: result.falsifiedEvidence,
            signatures,
            reasons: [...result.reasons]
        });
        const coveredHintSignatures = new Set(recovery.repairHints.map(hint => hint.signature));
        if (signatures.some(signature => !coveredHintSignatures.has(signature))) {
            const hintSignatures = [...new Set(recovery.attemptHistory.flatMap(attempt => attempt.signatures))];
            recovery.repairHints = await this.loadRepairHints(sessionId, hintSignatures, context.workspace);
        }
        if (context.diagnostics) {
            context.diagnostics.falsificationCount = recovery.totalFalsifications;
            context.diagnostics.repairRoundsUsed = recovery.attemptHistory.length;
            context.diagnostics.repeatedAttemptCount = recovery.repeatAttempts;
        }
        if (recovery.consecutiveFalsifications >= maxRepairRounds && !this.host.hasUnfinishedPlan(sessionId, context)) {
            recovery.terminated = true;
            recovery.terminationMessage = this.host.falsificationSummary(recovery);
        }
    }

    trackEditedFile(context: any, toolCall: { name: string }, definition: AgentToolDefinition, snapshot: FileSnapshot | null): void {
        const recovery: TurnRecoveryState | undefined = context.recovery;
        if (!recovery || !snapshot?.filePath) {
            return;
        }
        const writeTools = this.host.resolveWriteTools();
        if (!writeTools.includes(toolCall.name) && !writeTools.includes(definition.name)) {
            return;
        }
        recovery.editedFiles.push(snapshot.filePath);
    }

    async captureWriteHint(sessionId: string, context: any, toolCall: { id: string; name: string }, definition: AgentToolDefinition, snapshot: FileSnapshot | null): Promise<void> {
        const recovery: TurnRecoveryState | undefined = context.recovery;
        if (!recovery || !snapshot || snapshot.before === null) {
            return;
        }
        const writeTools = this.host.resolveWriteTools();
        if (!writeTools.includes(toolCall.name) && !writeTools.includes(definition.name)) {
            return;
        }
        const after = await this.host.readFileText(snapshot.filePath);
        if (after !== null && after === snapshot.before) {
            recovery.writeHints.push({
                toolName: toolCall.name,
                filePath: snapshot.filePath,
                reason: `Declared write to '${snapshot.filePath}' but file content did not change.`
            });
        }
    }

    private async runCommands(sessionId: string, context: any): Promise<void> {
        const recovery: TurnRecoveryState | undefined = context.recovery;
        const verification = this.host.options.verification;
        if (!recovery || verification?.enabled === false) {
            return;
        }
        const editedFiles = recovery.editedFiles;
        recovery.editedFiles = [];
        if (editedFiles.length === 0) {
            return;
        }
        try {
            const runner = new VerifyCommandRunner({
                verifyCommands: verification?.verifyCommands,
                autoScripts: verification?.autoScripts,
                timeoutMs: verification?.timeoutMs,
                maxOutputChars: verification?.maxOutputChars,
                workspace: context.workspace,
                signal: this.host.signal(sessionId)
            });
            const runs = await runner.run(editedFiles);
            recordVerifyCommandEvidence(context.evidenceLedger, runs, verification?.timeoutMs ?? DEFAULT_VERIFY_TIMEOUT_MS);
        } catch {
            // verification commands must never break the turn loop
        }
    }

    private buildRepairRecipes(attempts: FalsificationAttempt[], fixes: ToolEvidenceEntry[]): TurnRepairRecipe[] {
        if (fixes.length === 0 || attempts.length === 0) {
            return [];
        }
        const entries = fixes.map(entry => ({ toolName: entry.toolName, inputSummary: entry.inputSummary }));
        const goodSignatures = new Set(fixes.map(entry => buildAttemptSignature(entry.toolName, entry.inputSummary)));
        const goodTools = new Set(fixes.map(entry => entry.toolName));
        const recipes: TurnRepairRecipe[] = [];
        const seen = new Set<string>();
        for (const attempt of attempts) {
            for (const signature of attempt.signatures) {
                if (seen.has(signature)) continue;
                seen.add(signature);
                if (goodSignatures.has(signature) || attempt.entries.some(entry => goodTools.has(entry.toolName))) {
                    recipes.push({ signature, fixes: entries });
                }
            }
        }
        return recipes;
    }

    private async loadRepairHints(sessionId: string, signatures: string[], workspace?: string): Promise<ResolvedRepairHint[]> {
        if (!this.host.turnDiagnosticsStore || signatures.length === 0) {
            return [];
        }
        try {
            const records = workspace
                ? await this.host.turnDiagnosticsStore.list(undefined, { workspaceId: workspace, limit: TURN_DIAGNOSTICS_LIMIT, order: 'DESC' })
                : await this.host.turnDiagnosticsStore.list(sessionId, { limit: TURN_DIAGNOSTICS_LIMIT, order: 'DESC' });
            return collectResolvedRepairHints(records, signatures);
        } catch {
            return [];
        }
    }
}
