import { AgentTurnMessageInput } from './AgentMessage';

/** Per-tool permission for a single turn (A5 per-agent permission matrix). */
export type AgentToolPermission = 'allow' | 'ask' | 'deny';

/** Per-turn agent governance: permission overrides and step budget. */
export interface AgentTurnAgentConfig {
    /**
     * Per-tool permission overrides for this turn. Keys are exact tool names:
     * 'allow' runs without approval, 'ask' forces an approval even when the
     * tool is not in the default requireApproval list, 'deny' skips the tool
     * with an explanatory reason. Tools without an entry keep their default.
     */
    permissions?: Record<string, AgentToolPermission>;
    /** Max tool invocations this turn; 0 or undefined means unlimited. */
    maxSteps?: number;
}

export interface AgentTurnInput {
    sessionId: string;
    input: string;
    principalId?: string;
    message?: AgentTurnMessageInput;
    profile?: string;
    /** A5: per-agent permission matrix applied for the duration of this turn. */
    agent?: AgentTurnAgentConfig;
}
