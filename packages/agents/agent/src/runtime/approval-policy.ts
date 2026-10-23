import { AgentOptions, defaultAgentOptions } from '../options';
import { ApprovalManagerOptions } from '../tools/ToolApprovalManager';

/**
 * Approval-manager options resolved from the agent options.
 *
 * Kept outside the runtime so `resolveApprovalManager` stays small (the source
 * size ratchet) and the same policy can be applied to the IoC-provided manager
 * via `ToolApprovalManager.configure`.
 */
export function resolveApprovalPolicyOptions(options: AgentOptions, autoReview: boolean): ApprovalManagerOptions {
    return {
        defaultTimeoutMs: options.policy?.limits?.approvalTimeoutMs
            ?? options.tools?.approvalTimeoutMs
            ?? defaultAgentOptions.policy?.limits?.approvalTimeoutMs
            ?? defaultAgentOptions.tools?.approvalTimeoutMs,
        autoDeny: options.tools?.approvalAutoDeny === true,
        autoReview
    };
}
