import type { AgentOptions, AgentPolicyResolution } from '../options';
import { DEFAULT_APPROVAL_REQUIRED_RULES } from '../options';
import type { ApprovalRule } from '../tools/ToolApprovalManager';
import { DEFAULT_ARCHETYPE } from '../archetype/AgentArchetype';
import { DEFAULT_VERIFICATION_WRITE_TOOLS } from '../harness/VerificationGate';

export interface PolicyResolutionHost {
    options: AgentOptions;
    approvalManager?: () => { setDefaultTimeout?(ms: number): void } | undefined;
    sessionArchetype(sessionId: string): string | undefined;
}

/** Policy source chain resolutions and mutable approval timeout. */
export class PolicyResolutionController {
    constructor(private readonly host: PolicyResolutionHost) {
    }

    resolveDefaultArchetype(): AgentPolicyResolution<string> {
        const policyArchetype = this.host.options.policy?.defaultArchetype;
        if (policyArchetype) {
            return { value: policyArchetype, source: this.host.options.policy?.source ?? 'workspace' };
        }
        const legacyArchetype = this.host.options.defaultArchetype;
        if (legacyArchetype) {
            return {
                value: legacyArchetype,
                source: legacyArchetype === DEFAULT_ARCHETYPE ? 'default' : 'workspace'
            };
        }
        return { value: DEFAULT_ARCHETYPE, source: 'default' };
    }

    resolveSessionArchetype(sessionId: string): AgentPolicyResolution<string> {
        const sessionArchetype = this.host.sessionArchetype(sessionId);
        if (sessionArchetype) {
            return { value: sessionArchetype, source: 'session' };
        }
        return this.resolveDefaultArchetype();
    }

    resolveVerificationWriteTools(): AgentPolicyResolution<string[]> {
        const policyWriteTools = this.host.options.policy?.verification?.writeTools;
        if (policyWriteTools?.length) {
            return { value: policyWriteTools.slice(), source: this.host.options.policy?.source ?? 'workspace' };
        }
        const legacyWriteTools = this.host.options.verificationWriteTools;
        if (legacyWriteTools?.length) {
            return {
                value: legacyWriteTools.slice(),
                source: sameStringList(legacyWriteTools, DEFAULT_VERIFICATION_WRITE_TOOLS) ? 'default' : 'workspace'
            };
        }
        return { value: DEFAULT_VERIFICATION_WRITE_TOOLS.slice(), source: 'default' };
    }

    resolveApprovalRequired(): AgentPolicyResolution<ApprovalRule[]> {
        const policyRules = this.host.options.policy?.approval?.requireApproval;
        if (Array.isArray(policyRules)) {
            return { value: policyRules.slice(), source: this.host.options.policy?.source ?? 'workspace' };
        }
        const legacyRules = this.host.options.tools?.requireApproval;
        if (Array.isArray(legacyRules)) {
            return {
                value: legacyRules.slice(),
                source: sameApprovalRules(legacyRules, DEFAULT_APPROVAL_REQUIRED_RULES) ? 'default' : 'workspace'
            };
        }
        return { value: DEFAULT_APPROVAL_REQUIRED_RULES.slice(), source: 'default' };
    }

    resolveApprovalAutoReview(): AgentPolicyResolution<boolean> {
        const policyAutoReview = this.host.options.policy?.approval?.autoReview;
        if (policyAutoReview !== undefined) {
            return { value: policyAutoReview, source: this.host.options.policy?.source ?? 'workspace' };
        }
        const legacyAutoReview = this.host.options.tools?.approvalAutoReview;
        if (legacyAutoReview !== undefined) {
            return { value: legacyAutoReview, source: legacyAutoReview === false ? 'default' : 'workspace' };
        }
        return { value: false, source: 'default' };
    }

    setApprovalTimeout(timeoutMs: number): void {
        const requested = Math.floor(Number(timeoutMs));
        if (!Number.isFinite(requested) || requested <= 0) {
            return;
        }
        const limits = { ...(this.host.options.policy?.limits || {}), approvalTimeoutMs: requested };
        this.host.options.policy = { ...(this.host.options.policy || {}), limits };
        this.host.approvalManager?.()?.setDefaultTimeout?.(requested);
    }
}

function sameStringList(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameApprovalRules(left: ApprovalRule[], right: ApprovalRule[]): boolean {
    if (left.length !== right.length) return false;
    return left.every((rule, index) => {
        const other = right[index];
        if (typeof rule === 'string' || typeof other === 'string') return rule === other;
        return rule.category === other.category && rule.action === other.action
            && rule.mode === other.mode && sameStringList(rule.names ?? [], other.names ?? []);
    });
}
