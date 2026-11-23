import type { AgentMessage } from './AgentMessage';
import type { ModelRequest } from '../model/ModelRequest';
import type { TurnRecoveryState } from './TurnRecoveryState';
import { FALSIFICATION_ESCALATION_THRESHOLD, TURN_DIAGNOSTICS_RECENT_ATTEMPTS } from '../AgentLimits';
import { buildExplorationGuidancePrompt, buildRepairPrompt } from '../harness/RepairExploration';

const LOOP_RECOVERY_SYSTEM_PROMPT = 'You are repeating the same tool calls without making progress. Change strategy: try a different tool, different arguments, or break the work into smaller steps. If you cannot make progress, state clearly that you are blocked and explain why instead of repeating the same calls.';

export interface TurnRecoveryHost {
    createMessage(role: 'system' | 'user', content: string): AgentMessage;
}

/** Loop/falsification recovery prompts and termination summaries. */
export class TurnRecoveryController {
    constructor(private readonly host: TurnRecoveryHost) {
    }

    resolveTermination(context: any, maxLoopRecoveries: number): string | undefined {
        const recovery: TurnRecoveryState | undefined = context?.recovery;
        if (!recovery) {
            return undefined;
        }
        if (recovery.terminated) {
            return recovery.terminationMessage;
        }
        if (recovery.loopPending && recovery.loopInjections >= maxLoopRecoveries) {
            recovery.loopPending = false;
            return this.buildLoopBlockedMessage(recovery.loopInjections);
        }
        return undefined;
    }

    maybeInjectPrompt(request: ModelRequest, context: any): ModelRequest | undefined {
        const recovery: TurnRecoveryState | undefined = context?.recovery;
        if (!recovery) {
            return undefined;
        }
        if (recovery.loopPending) {
            recovery.loopPending = false;
            recovery.loopInjections++;
            if (context.diagnostics) {
                context.diagnostics.loopRecoveryCount = recovery.loopInjections;
            }
            return this.injectSystemPrompt(request, LOOP_RECOVERY_SYSTEM_PROMPT);
        }
        if (recovery.repairPending) {
            recovery.repairPending = false;
            recovery.repairInjections++;
            if (context.diagnostics) {
                context.diagnostics.falsificationCount = recovery.totalFalsifications;
                context.diagnostics.repairRoundsUsed = recovery.attemptHistory.length;
                context.diagnostics.repeatedAttemptCount = recovery.repeatAttempts;
            }
            const escalate = recovery.consecutiveFalsifications >= FALSIFICATION_ESCALATION_THRESHOLD;
            const prompt = escalate
                ? buildExplorationGuidancePrompt(recovery.attemptHistory, recovery.repairHints)
                : buildRepairPrompt(recovery.attemptHistory, recovery.repeatAttempts, { resolvedHints: recovery.repairHints });
            return this.injectSystemPrompt(request, prompt);
        }
        return undefined;
    }

    injectSystemPrompt(request: ModelRequest, prompt: string): ModelRequest {
        return { ...request, messages: [this.host.createMessage('system', prompt), ...request.messages] };
    }

    buildLoopBlockedMessage(injections: number): string {
        return `I detected a repeating tool-call loop that did not resolve after ${injections} recovery attempt(s). Ending the turn with the results gathered so far.`;
    }

    buildFalsificationSummaryMessage(recovery: TurnRecoveryState): string {
        const attempts = recovery.attemptHistory;
        if (attempts.length === 0) {
            return `The verification gate falsified ${recovery.consecutiveFalsifications} consecutive round(s).\nEnding the turn with a failure summary.`;
        }
        const lines = attempts.slice(-TURN_DIAGNOSTICS_RECENT_ATTEMPTS).map(attempt => {
            const entries = attempt.entries.slice(0, 4).map(entry => {
                const reason = entry.falsificationReason ?? entry.error ?? 'failed';
                return `- Tool "${entry.toolName}": ${reason}`;
            });
            return `Attempt ${attempt.round}:\n${entries.join('\n')}`;
        });
        const repeatNote = recovery.repeatAttempts > 0
            ? `\nNote: ${recovery.repeatAttempts} already-rejected attempt(s) were repeated.`
            : '';
        return `The verification gate falsified ${recovery.consecutiveFalsifications} consecutive round(s) across ${attempts.length} attempt(s).\n${lines.join('\n')}${repeatNote}\nEnding the turn with a failure summary.`;
    }

    buildTerminationWrapUpMessage(termination: string): AgentMessage {
        return this.host.createMessage('user',
            `The turn is ending because tool execution failed verification. ${termination}\n\nPlease provide a brief, natural final response to the user, in the same language the user used, explaining what was attempted, what failed, and any partial results or next steps. Do not call any more tools.`);
    }
}
