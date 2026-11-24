import type { AgentTurnDiagnostics } from './AgentEvents';
import type { AgentTurnAgentConfig } from './AgentTurnInput';
import type { EvidenceLedger } from '../harness/EvidenceLedger';
import type { TurnRecoveryState } from './TurnRecoveryState';
import type { RepeatReadOnlyCallCache } from './tool-repeat-cache';

/** Mutable per-turn context threaded through the turn loop and its controllers. */
export interface TurnExecutionContext {
    principalId?: string;
    workspace?: string;
    diagnostics?: AgentTurnDiagnostics;
    profile?: string;
    evidenceLedger?: EvidenceLedger;
    recovery?: TurnRecoveryState;
    agent?: AgentTurnAgentConfig;
    toolSteps?: number;
    /** Set when a `todo` tool result updated this turn's plan; gates plan-continuation. */
    planTouched?: boolean;
    /** Number of plan-continuation prompts already injected this turn. */
    planContinuations?: number;
    /** G29: transient delegation quality note injected into the next model request (proactive mode). */
    delegationQualityNote?: string;
    readOnlyResults?: RepeatReadOnlyCallCache;
    /** P3.1: tool calls started while the model was still streaming (keyed by call id). */
    liveToolResults?: Map<string, Promise<any>>;
}
