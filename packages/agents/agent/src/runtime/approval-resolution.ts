import { ApplicationContext, UuidGenerator } from '@tsdi/core';
import { AgentOptions } from '../options';
import { ApprovalManager, DefaultApprovalStrategy, ToolApprovalManager } from '../tools/ToolApprovalManager';
import { resolveApprovalPolicyOptions } from './approval-policy';
import { AgentClock } from './Clock';

export interface RuntimeApprovalResolution {
    approvalManager?: ApprovalManager;
    required: any[];
    autoReview: boolean;
    options: AgentOptions;
    app: ApplicationContext;
    uuid: UuidGenerator;
    clock?: AgentClock;
}

/** Reuse an injected manager when configured, otherwise build the policy one. */
export function resolveRuntimeApprovalManager(input: RuntimeApprovalResolution): ApprovalManager | undefined {
    if (input.approvalManager?.isConfigured()) {
        return input.approvalManager;
    }
    if (!input.required.length) {
        return undefined;
    }
    const options = resolveApprovalPolicyOptions(input.options, input.autoReview);
    // Read the opt-in flag live: a settings toggle updates the same options
    // object, so the already-configured manager picks it up on the next call.
    const strategy = new DefaultApprovalStrategy(
        input.required,
        false,
        () => input.options.policy?.approval?.readOnlyShell === true,
        () => input.options.policy?.approval?.requireApproval
    );
    if (input.approvalManager instanceof ToolApprovalManager) {
        input.approvalManager.configure(strategy, options);
        return input.approvalManager;
    }
    return new ToolApprovalManager(input.app, input.uuid, strategy, options, undefined, undefined, input.clock);
}
