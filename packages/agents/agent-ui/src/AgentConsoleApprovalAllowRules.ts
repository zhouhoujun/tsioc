import { sanitizeApprovalAllowRules } from './AgentConsoleSettingsStore';

/**
 * Durable project approval allow rules.
 *
 * Local hosts keep the live list on the runtime approval manager; browser and
 * attached hosts have no manager in-process, so the persisted workspace
 * settings are the source of truth. Reading through both keeps a rule added in
 * one surface from overwriting the others.
 */
export async function readProjectApprovalAllowRules(host: any): Promise<string[]> {
    const manager: any = host?.resolvedApprovalManager ?? host?.approvalManager;
    try {
        const live = manager?.getAllowRules?.();
        if (Array.isArray(live)) {
            return sanitizeApprovalAllowRules(live) || [];
        }
    } catch {
        // Fall through to the persisted list.
    }
    try {
        const workspace = String(host?.resolveHistoryWorkspace?.() || host?.state?.workspace || '').trim();
        const persisted = await host?.settingsStore?.load?.(workspace);
        const rules = sanitizeApprovalAllowRules(persisted?.approvalAllowRules);
        if (rules) {
            return rules;
        }
    } catch {
        // A failed read keeps the previous rules; the caller can still add one.
    }
    return [];
}

/** Normalize, apply to the runtime manager (when present) and persist. */
export async function saveProjectApprovalAllowRules(host: any, rules: string[]): Promise<string[]> {
    const normalized = sanitizeApprovalAllowRules(rules) || [];
    try {
        const manager: any = host?.resolvedApprovalManager ?? host?.approvalManager;
        manager?.setAllowRules?.(normalized);
    } catch {
        // Optional runtime surface; persistence still carries the rule.
    }
    await host?.persistSettings?.({ approvalAllowRules: normalized });
    return normalized;
}
