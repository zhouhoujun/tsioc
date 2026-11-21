import { DEFAULT_APPROVAL_REQUIRED_RULES, APPROVAL_CATEGORY_DEFINITIONS } from '@tsdi/agent';
import type { ApprovalRule } from '@tsdi/agent';
import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

/**
 * `/permissions rules` — review and edit the ordered approval rule list.
 *
 * Rule semantics stay in the runtime (`DefaultApprovalStrategy`, last match
 * wins). This module only edits the shared `policy.approval.requireApproval`
 * array and persists it; the strategy reads it live on the next decision.
 */

const CATEGORIES = ['sandbox', 'fs', 'network', 'mcp', 'skill'];
const ACTIONS = ['ask', 'allow', 'deny'];

export interface ApprovalRuleCommandHost {
    translator?: AgentUiTranslator | null;
    state: { openTextOverlay(kind: string, lines: string[], visibleLines?: number): void };
    options: any;
    appRpc?: { request(method: string, params?: any, context?: any): Promise<any> } | null;
    notify(message: string): void;
    rpcRequestContext?(): any;
    persistSettings?(patch: Record<string, any>): Promise<void> | void;
    select?(title: string, options: Array<{ label: string; value: string; description?: string }>, selectedIndex?: number, hint?: string): Promise<string | undefined>;
}

/** Effective list mirrors runtime precedence: policy rules → legacy tools → defaults. */
export function readEffectiveApprovalRules(options: any): ApprovalRule[] {
    const policyRules = options?.policy?.approval?.requireApproval;
    if (Array.isArray(policyRules)) {
        return [...policyRules];
    }
    const legacyRules = options?.tools?.requireApproval;
    if (Array.isArray(legacyRules)) {
        return [...legacyRules];
    }
    return [...DEFAULT_APPROVAL_REQUIRED_RULES];
}

export function describeApprovalRule(rule: ApprovalRule): string {
    if (typeof rule === 'string') {
        return `ask ${rule}`;
    }
    const parts: string[] = [rule.action || (rule.mode === 'auto-deny' ? 'deny' : 'ask'), rule.category];
    if (rule.names?.length) {
        parts.push(rule.names.join(', '));
    }
    if (rule.resource) {
        parts.push(Array.isArray(rule.resource) ? rule.resource.join(', ') : rule.resource);
    }
    return parts.filter(Boolean).join(' ');
}

export type ApprovalRuleAddResult = { rule: ApprovalRule } | { error: string };

/** Parse `/permissions rules add ...`; bare text becomes a string tool rule. */
export function parseApprovalRuleAdd(tokens: string[]): ApprovalRuleAddResult {
    if (!tokens.length) {
        return { error: 'rule is empty' };
    }
    const action = String(tokens[0] || '').toLowerCase();
    if (ACTIONS.includes(action)) {
        const category = String(tokens[1] || '').toLowerCase();
        if (!CATEGORIES.includes(category)) {
            return { error: `unknown category '${tokens[1] || ''}'` };
        }
        const resource = tokens.slice(2).join(' ').trim();
        return {
            rule: {
                category: category as any,
                action: action as 'ask' | 'allow' | 'deny',
                ...(resource ? { resource } : {})
            }
        };
    }
    const pattern = tokens.join(' ').trim();
    return pattern ? { rule: pattern } : { error: 'rule is empty' };
}

async function saveRules(host: ApprovalRuleCommandHost, rules: ApprovalRule[]): Promise<void> {
    const next = rules.length ? rules : [...DEFAULT_APPROVAL_REQUIRED_RULES];
    host.options.policy = {
        ...(host.options.policy || {}),
        approval: { ...(host.options.policy?.approval || {}), requireApproval: next }
    };
    if (host.appRpc) {
        await host.appRpc.request(
            'settings.ui.set',
            { approvalRequireApproval: next },
            host.rpcRequestContext?.()
        ).catch(() => undefined);
    }
    await host.persistSettings?.({ approvalRequireApproval: next });
}

function showRules(host: ApprovalRuleCommandHost): void {
    const rules = readEffectiveApprovalRules(host.options);
    const lines = rules.length
        ? rules.map((rule, index) => `${index + 1}. ${describeApprovalRule(rule)}`)
        : [formatAgentUiNotice(host.translator, 'approvalRulesCommandEmpty')];
    lines.push(formatAgentUiNotice(host.translator, 'approvalRulesCommandHint'));
    host.state.openTextOverlay(
        formatAgentUiNotice(host.translator, 'approvalRulesCommandTitle'),
        lines,
        Math.min(24, Math.max(3, lines.length))
    );
}

export async function runApprovalRulesCommand(host: ApprovalRuleCommandHost, args: string): Promise<void> {    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const verb = String(tokens[0] || '').toLowerCase();
    if (!verb || verb === 'list' || verb === 'status') {
        showRules(host);
        return;
    }
    if (verb === 'add') {
        const parsed = parseApprovalRuleAdd(tokens.slice(1));
        if ('error' in parsed) {
            host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandInvalid', { reason: parsed.error }));
            return;
        }
        const rules = [...readEffectiveApprovalRules(host.options), parsed.rule];
        await saveRules(host, rules);
        host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandAdded', { rule: describeApprovalRule(parsed.rule) }));
        return;
    }
    if (verb === 'remove' || verb === 'delete') {
        const index = Math.floor(Number(tokens[1]) || 0) - 1;
        const rules = readEffectiveApprovalRules(host.options);
        if (index < 0 || index >= rules.length) {
            host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandIndexMissing', { index: tokens[1] || '' }));
            return;
        }
        const [removed] = rules.splice(index, 1);
        await saveRules(host, rules);
        host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandRemoved', {
            index: index + 1,
            rule: describeApprovalRule(removed)
        }));
        return;
    }
    if (verb === 'clear' || verb === 'reset') {
        if (verb === 'clear' && String(tokens[1] || '').toLowerCase() !== 'confirm') {
            host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandClearConfirm'));
            return;
        }
        await saveRules(host, [...DEFAULT_APPROVAL_REQUIRED_RULES]);
        host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandReset'));
        return;
    }
    host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandUsage'));
}

/**
 * Menu-driven rule creation: action → category. Resource-scoped rules stay on
 * `/permissions rules add <action> <category> [resource]` because they need
 * free text, but the common "ask/allow/deny a whole category" case is fully
 * operable from the panel (opencode-style forms instead of memorizing syntax).
 */
async function addRuleFromPanel(host: ApprovalRuleCommandHost): Promise<void> {
    if (!host.select) {
        host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandHint'));
        return;
    }
    const action = await host.select(
        formatAgentUiNotice(host.translator, 'approvalRulesAddActionTitle'),
        [
            { label: 'ask', value: 'ask', description: formatAgentUiNotice(host.translator, 'approvalRulesAddActionAsk') },
            { label: 'allow', value: 'allow', description: formatAgentUiNotice(host.translator, 'approvalRulesAddActionAllow') },
            { label: 'deny', value: 'deny', description: formatAgentUiNotice(host.translator, 'approvalRulesAddActionDeny') }
        ],
        0,
        formatAgentUiNotice(host.translator, 'approvalRulesCommandHint')
    );
    if (!action || !ACTIONS.includes(action)) {
        return;
    }
    const category = await host.select(
        formatAgentUiNotice(host.translator, 'approvalRulesAddCategoryTitle'),
        CATEGORIES.map(item => ({
            label: item,
            value: item,
            description: formatAgentUiNotice(host.translator, 'approvalRulesAddCategoryNames', {
                names: describeCategoryNames(item)
            })
        })),
        0,
        formatAgentUiNotice(host.translator, 'approvalRulesCommandHint')
    );
    if (!category || !CATEGORIES.includes(category)) {
        return;
    }
    const rule: ApprovalRule = { category: category as any, action: action as 'ask' | 'allow' | 'deny' };
    await saveRules(host, [...readEffectiveApprovalRules(host.options), rule]);
    host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandAdded', { rule: describeApprovalRule(rule) }));
}

function describeCategoryNames(category: string): string {
    const names = APPROVAL_CATEGORY_DEFINITIONS[category as keyof typeof APPROVAL_CATEGORY_DEFINITIONS]?.names || [];
    if (!names.length) {
        return category;
    }
    const shown = names.slice(0, 3).join(', ');
    return names.length > 3 ? `${shown}…` : shown;
}

/**
 * Settings-center entry: pick a rule to remove, add via the command form, or
 * reset to the safe defaults. Keeps the ordered list authoritative.
 */
export async function openApprovalRulesPanel(host: ApprovalRuleCommandHost): Promise<void> {
    if (!host.select) {
        showRules(host);
        return;
    }
    const rules = readEffectiveApprovalRules(host.options);
    const picked = await host.select(
        formatAgentUiNotice(host.translator, 'approvalRulesCommandTitle'),
        [
            ...rules.map((rule, index) => ({
                label: `${index + 1}. ${describeApprovalRule(rule)}`,
                value: `rule:${index}`
            })),
            { label: formatAgentUiNotice(host.translator, 'approvalRulesPanelAdd'), value: '__add__' },
            { label: formatAgentUiNotice(host.translator, 'approvalRulesPanelReset'), value: '__reset__' }
        ],
        0,
        formatAgentUiNotice(host.translator, 'approvalRulesCommandHint')
    );
    if (!picked) {
        return;
    }
    if (picked === '__add__') {
        await addRuleFromPanel(host);
        return;
    }
    if (picked === '__reset__') {
        await saveRules(host, [...DEFAULT_APPROVAL_REQUIRED_RULES]);
        host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandReset'));
        return;
    }
    const index = Number(picked.split(':')[1]);
    if (!Number.isInteger(index) || index < 0 || index >= rules.length) {
        host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandIndexMissing', { index: picked }));
        return;
    }
    const action = await host.select(
        formatAgentUiNotice(host.translator, 'approvalRulesPanelActionTitle'),
        [
            { label: formatAgentUiNotice(host.translator, 'approvalRulesPanelRemove'), value: 'remove' },
            { label: formatAgentUiNotice(host.translator, 'approvalRulesPanelCancel'), value: 'cancel' }
        ],
        0,
        formatAgentUiNotice(host.translator, 'approvalRulesCommandHint')
    );
    if (action !== 'remove') {
        return;
    }
    const [removed] = rules.splice(index, 1);
    await saveRules(host, rules);
    host.notify(formatAgentUiNotice(host.translator, 'approvalRulesCommandRemoved', {
        index: index + 1,
        rule: describeApprovalRule(removed)
    }));
}
