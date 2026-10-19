/** Leftover tool rounds at which the model is told to stop exploring. */
export const NEAR_TOOL_ROUND_LIMIT_REMAINING = 2;

/** Prompt used once the turn has exhausted its tool rounds. */
export const MAX_TOOL_ROUNDS_PROMPT = 'You have reached the maximum number of tool call rounds. Please provide your best answer now based on the results you have so far.';

/**
 * Guidance for the round just before the limit.
 *
 * Evidence from a real run: 72 tool calls hit the default cap of 20 rounds, 14 of
 * them repeated directory listings, and the turn ended without finishing its
 * work. Telling the model how many rounds are left (and that `coding_task` can
 * take the rest) is the cheap measure; the repeated-call cache removes part of
 * the waste itself.
 *
 * Returns undefined unless this is exactly the warning round, so the prompt is
 * injected once per turn.
 */
export function nearToolRoundLimitPrompt(round: number, maxRounds: number): string | undefined {
    if (maxRounds - round !== NEAR_TOOL_ROUND_LIMIT_REMAINING) {
        return undefined;
    }
    return `Only ${NEAR_TOOL_ROUND_LIMIT_REMAINING} of ${maxRounds} tool rounds are left. Stop exploring: do not repeat reads or directory listings. Finish the task with the evidence you already have, or hand the remaining work to a single coding_task call, then give the final answer.`;
}
