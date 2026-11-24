import { optionalSessionId } from './request-helpers';
import type { AgentRpcRuntime } from './rpc-contracts';

/** P1.1: v3 permission rules plus the effective decision for an optional tool probe. */
export function listPermissionRules(runtime: AgentRpcRuntime, params: any): any {
    const sessionId = optionalSessionId(params);
    const rules = runtime.listPermissionRules?.(sessionId) ?? [];
    const tool = typeof params?.tool === 'string' ? params.tool.trim() : '';
    const decision = tool ? runtime.inspectPermission?.(tool, params?.input ?? params?.resource, sessionId) : undefined;
    if (!decision) {
        return { rules };
    }
    return {
        rules,
        decision: {
            effect: decision.effect, layer: decision.layer, matched: decision.matched, denied: decision.denied,
            actions: decision.actions, resources: decision.resources, rule: decision.rule
        }
    };
}
