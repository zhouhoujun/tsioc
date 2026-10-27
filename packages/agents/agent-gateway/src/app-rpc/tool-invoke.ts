import { AgentWorkspaceTrustResolver, ApprovalManager, ToolRegistry, isWorkspaceMutatingTool, resolveWorkspaceTrustApproval } from '@tsdi/agent';
import { AppRpcError, AppRpcRequestContext } from '../contracts/AppRpc';

/** Everything `tools.invoke` needs from the RPC server. */
export interface ToolInvokeHost {
    tools: ToolRegistry;
    approvalManager?: ApprovalManager | null;
    workspaceTrust?: AgentWorkspaceTrustResolver | null;
    ensureSessionAccess(sessionId: string, context: AppRpcRequestContext, options?: { createIfMissing?: boolean }): Promise<void>;
    requireSessionId(params: any): string;
    requireString(value: any, label: string): string;
}

/**
 * Invoke a tool for the console.
 *
 * A console `/cd` (or any host) can point a privileged invocation at a
 * workspace the user has not trusted; the turn path already asks for trust in
 * that case, so the RPC path must not silently allow mutations there.
 */
export async function invokeToolWithWorkspaceTrust(host: ToolInvokeHost, params: any, context: AppRpcRequestContext): Promise<any> {
    const sessionId = host.requireSessionId(params);
    const name = host.requireString(params?.name, 'tools.invoke name');
    await host.ensureSessionAccess(sessionId, context);
    const workspace = typeof params?.workspace === 'string' && params.workspace.trim() ? params.workspace.trim() : undefined;
    if (workspace && host.workspaceTrust && !host.workspaceTrust.isTrusted(workspace)) {
        const definition = host.tools.getToolDefinition(name, sessionId);
        if (definition && isWorkspaceMutatingTool(definition)) {
            const approval = await resolveWorkspaceTrustApproval({
                workspaceTrust: host.workspaceTrust,
                approvalManager: host.approvalManager ?? undefined,
                workspace,
                toolName: name,
                sessionId
            });
            if (!approval.approved) {
                throw new AppRpcError(-32001, `Workspace '${workspace}' is not trusted; tool "${name}" would modify it. Run \`tsdi-agent trust ${workspace}\` to allow modifications.`);
            }
        }
    }
    const output = await host.tools.invoke(name, params?.input, sessionId, context.principalId, workspace);
    return { sessionId, name, output };
}
