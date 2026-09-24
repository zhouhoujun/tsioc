import { AgentWorkspaceTrustResolver } from '../tokens';
import { AgentToolDefinition } from '../tools/AgentTool';
import { ApprovalDecision, ApprovalManager } from '../tools/ToolApprovalManager';

const WORKSPACE_MUTATING_TOOLSETS = new Set(['filesystem_write', 'terminal', 'git', 'process', 'code_execution', 'ai_cli']);
const WORKSPACE_MUTATING_TOOLS = new Set([
    'write_file', 'edit_file', 'delete_file', 'move_file', 'copy_file', 'mkdir', 'apply_patch',
    'terminal', 'git_operations', 'process.start', 'execute_code'
]);

export function isWorkspaceMutatingTool(definition: AgentToolDefinition): boolean {
    if (WORKSPACE_MUTATING_TOOLS.has(definition.name)) {
        return true;
    }
    return !!definition.toolset
        && WORKSPACE_MUTATING_TOOLSETS.has(definition.toolset)
        && definition.execution?.sideEffect === true;
}

export interface WorkspaceTrustApprovalOptions {
    workspaceTrust: AgentWorkspaceTrustResolver | null | undefined;
    approvalManager?: ApprovalManager;
    workspace: string;
    toolName: string;
    sessionId: string;
}

export interface WorkspaceTrustApprovalResult {
    approved: boolean;
}

/**
 * Resolve workspace trust for a mutating tool call on an untrusted workspace.
 *
 * Without an approval manager the call stays blocked (the runtime reports the
 * original "run `tsdi-agent trust`" guidance). With one, a forced
 * `workspace_trust` approval is surfaced: approving records the workspace as
 * trusted on the resolver and lets the call proceed; denying, timing out, or
 * cancelling keeps the call blocked.
 */
export async function resolveWorkspaceTrustApproval(options: WorkspaceTrustApprovalOptions): Promise<WorkspaceTrustApprovalResult> {
    const { workspaceTrust, approvalManager, workspace, toolName, sessionId } = options;
    if (!approvalManager || !workspaceTrust) {
        return { approved: false };
    }
    const approval = await approvalManager.checkApproval('workspace_trust', { workspace, tool: toolName }, sessionId, true);
    if (approval.decision !== ApprovalDecision.APPROVED) {
        return { approved: false };
    }
    workspaceTrust.trust?.(workspace);
    return { approved: true };
}