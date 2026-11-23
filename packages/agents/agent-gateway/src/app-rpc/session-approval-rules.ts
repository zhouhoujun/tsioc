import type { ApprovalRule } from '@tsdi/agent';
import { requireSessionId } from './request-helpers';

interface SessionApprovalRulesHost {
    runtime: { approvalManager?: { setSessionRules?(sessionId: string, rules: ApprovalRule[]): void; getSessionRules?(sessionId: string): ApprovalRule[] } };
    approvalManager?: { setSessionRules?(sessionId: string, rules: ApprovalRule[]): void; getSessionRules?(sessionId: string): ApprovalRule[] };
    ensureSessionAccess(sessionId: string, context: any): Promise<void>;
}

function rulesManager(host: SessionApprovalRulesHost) {
    return host.runtime?.approvalManager ?? host.approvalManager;
}

/** `session.approval_rules.set`: per-session overrides, workspace deny still wins. */
export async function setSessionApprovalRules(host: SessionApprovalRulesHost, params: any, context: any): Promise<{ sessionId: string; rules: ApprovalRule[] }> {
    const sessionId = requireSessionId(params);
    await host.ensureSessionAccess(sessionId, context);
    const rules = Array.isArray(params?.rules) ? params.rules as ApprovalRule[] : [];
    const manager = rulesManager(host);
    manager?.setSessionRules?.(sessionId, rules);
    return { sessionId, rules: manager?.getSessionRules?.(sessionId) ?? [] };
}

/** `session.approval_rules.get`: current per-session overrides. */
export async function getSessionApprovalRules(host: SessionApprovalRulesHost, params: any, context: any): Promise<{ sessionId: string; rules: ApprovalRule[] }> {
    const sessionId = requireSessionId(params);
    await host.ensureSessionAccess(sessionId, context);
    return { sessionId, rules: rulesManager(host)?.getSessionRules?.(sessionId) ?? [] };
}
