import type { ApprovalManager } from '../tools/ToolApprovalManager';
import { ApprovalDecision } from '../tools/ToolApprovalManager';

/** Sandbox denials that a one-shot escalation approval can resolve. */
export function isSandboxDenial(error: Error | undefined): boolean {
    const text = String(error?.message || '').toLowerCase();
    return /(^|\b)(erofs|eacces|eperm|permission denied|access denied|err_access_denied|read-only file system)\b/.test(text)
        || text.includes('bwrap:')
        || text.includes('sandbox')
        || text.includes('proxy enforcement rejected');
}

/**
 * Ask the host for a one-shot full-access escalation after a sandbox denial.
 * The caller retries with `sandboxMode: 'off'` only when this returns true.
 */
export async function requestSandboxEscalation(
    manager: ApprovalManager | undefined,
    toolName: string,
    input: unknown,
    sessionId: string,
    error: Error
): Promise<boolean> {
    if (!manager || !isSandboxDenial(error)) {
        return false;
    }
    const result = await manager.checkApproval(toolName, input, sessionId, true);
    return result?.decision === ApprovalDecision.APPROVED;
}
