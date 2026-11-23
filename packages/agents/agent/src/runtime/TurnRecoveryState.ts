import type { FalsificationAttempt, ResolvedRepairHint } from '../harness/RepairExploration';
import type { ToolEvidenceEntry } from '../harness/EvidenceLedger';

export interface TurnRecoveryState {
    loopPending: boolean;
    loopInjections: number;
    repairPending: boolean;
    repairInjections: number;
    consecutiveFalsifications: number;
    totalFalsifications: number;
    falsifiedEvidence: ToolEvidenceEntry[];
    attemptHistory: FalsificationAttempt[];
    repeatAttempts: number;
    writeHints: Array<{ toolName: string; filePath: string; reason: string }>;
    /** P79: file paths edited by write tools in the current round (verify-command inputs). */
    editedFiles: string[];
    repairHints: ResolvedRepairHint[];
    repairRecipes: TurnRepairRecipe[];
    terminated: boolean;
    terminationMessage: string;
}

export interface TurnRepairRecipe {
    signature: string;
    fixes: Array<{ toolName: string; inputSummary?: string }>;
}
