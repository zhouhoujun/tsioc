import type { ApprovalStrategy } from './ToolApprovalManager';
import { ApprovalCategory, classifyApprovalCategory } from './approval-categories';
import { isShellCommandTool, scanShellCommand } from './ShellCommandScanner';
import { approvalCommand, inspectShellCommand } from './shell-command-scanner';

/**
 * A3: granular approval rules (mirroring Codex granular permissions).
 *
 * Rules can be a string tool pattern (backward compatible) or a category-scoped
 * object. Object rules support:
 * - `names`: tool names/patterns inside the category;
 * - `resource`: path/command/url patterns inside the tool input;
 * - `action`: `ask` (default), `allow` or `deny`;
 * - `mode`: legacy alias (`auto-deny` = `deny`).
 *
 * Rules are evaluated in order and the **last match wins**, so an explicit
 * `allow` can override an earlier broad `ask`, and a later `deny` still wins.
 */
export interface ApprovalRuleObject {
    category: ApprovalCategory;
    /** Tool names / patterns within the category; when omitted the whole category matches. */
    names?: string[];
    /** Input resource patterns (path, command, url, cwd); trailing/leading `*` allowed. */
    resource?: string | string[];
    /** Decision for matching calls; defaults to `ask`. */
    action?: 'ask' | 'allow' | 'deny';
    /** Legacy alias: `'auto-deny'` maps to `action: 'deny'`. */
    mode?: 'ask' | 'auto-deny';
}

export type ApprovalRule = string | ApprovalRuleObject;

export interface ApprovalRuleExplanation {
    decision?: 'ask' | 'allow' | 'deny';
    /** Last matching rule (ordered rules: last match wins). */
    rule?: ApprovalRule;
    index?: number;
    /** True when the last match was an object rule (the scanner must not relax it). */
    explicit: boolean;
}

const RESOURCE_KEYS = ['path', 'filePath', 'target', 'command', 'cmd', 'url', 'cwd', 'pattern', 'query'];

export class DefaultApprovalStrategy implements ApprovalStrategy {
    private rules: ApprovalRule[];
    private shellScanner = false;
    readonly autoReview: boolean;
    /** Live opt-in flag: read on every decision so a settings toggle applies at once. */
    private readOnlyShell?: () => boolean;
    /** Live rule list: settings edits apply without rebuilding the manager. */
    private liveRules?: () => ApprovalRule[] | undefined;

    constructor(blocked?: ApprovalRule[], autoReview = false, readOnlyShell?: () => boolean, liveRules?: () => ApprovalRule[] | undefined) {
        this.rules = blocked ?? ['shell.exec', 'fs.write', 'fs.delete', 'db.execute', 'deploy', 'sudo.exec', 'playwright_browser', 'admin.*'];
        this.autoReview = autoReview;
        this.readOnlyShell = readOnlyShell;
        this.liveRules = liveRules;
    }

    requires(toolName: string, input: any): boolean {
        const decision = this.decide(toolName, input);
        return decision === 'ask' || decision === 'deny';
    }

    reasonDetail(toolName: string): { code: string; params?: Record<string, any> } { return { code: 'tool-requires-approval', params: { tool: toolName } }; }

    reason(toolName: string, _input: any): string {
        return `Tool "${toolName}" requires approval.`;
    }

    autoDenies(toolName: string, input: any): boolean {
        return this.decide(toolName, input) === 'deny';
    }

    setShellScanner(enabled: boolean): void {
        this.shellScanner = enabled === true;
    }

    isShellScannerEnabled(): boolean {
        return this.shellScanner;
    }

    /** Explain the last matching ordered rule without applying the shell scanner. */
    explain(toolName: string, input?: any): ApprovalRuleExplanation {
        return this.explainRules(toolName, input);
    }

    private explainRules(toolName: string, input: any): ApprovalRuleExplanation {
        const toolCategory = classifyApprovalCategory(toolName);
        let decision: 'ask' | 'allow' | 'deny' | undefined;
        // Object rules are explicit user intent; the scanner must not override
        // them. The last matching rule still wins, as documented.
        let explicit = false;
        let matched: ApprovalRule | undefined;
        let matchedIndex: number | undefined;
        const rules = this.liveRules?.() ?? this.rules;
        for (let index = 0; index < rules.length; index++) {
            const rule = rules[index];
            if (typeof rule === 'string') {
                if (this.matchesPattern(toolName, rule)) {
                    decision = 'ask';
                    explicit = false;
                    matched = rule;
                    matchedIndex = index;
                    continue;
                }
                // Default rules name a category member (`shell.exec`, `fs.write`)
                // rather than a tool; match those by the tool's category.
                const ruleCategory = classifyApprovalCategory(rule);
                if (toolCategory && ruleCategory && toolCategory === ruleCategory) {
                    decision = 'ask';
                    explicit = false;
                    matched = rule;
                    matchedIndex = index;
                }
            } else if (this.matchesRule(toolName, input, rule)) {
                decision = rule.action ?? (rule.mode === 'auto-deny' ? 'deny' : 'ask');
                explicit = true;
                matched = rule;
                matchedIndex = index;
            }
        }
        return { decision, explicit, ...(matched !== undefined ? { rule: matched, index: matchedIndex } : {}) };
    }

    private decide(toolName: string, input: any): 'ask' | 'allow' | 'deny' | undefined {
        const toolCategory = classifyApprovalCategory(toolName);
        const explained = this.explainRules(toolName, input);
        if (explained.decision === 'ask' && !explained.explicit && toolCategory === 'sandbox' && this.readOnlyShell?.()) {
            if (inspectShellCommand(approvalCommand(input)).readOnly) {
                return 'allow';
            }
        }
        return explained.decision;
    }

    private matchesRule(toolName: string, input: any, rule: ApprovalRuleObject): boolean {
        if (classifyApprovalCategory(toolName) !== rule.category) {
            return false;
        }
        if (rule.names && rule.names.length > 0 && !rule.names.some(pattern => this.matchesPattern(toolName, pattern))) {
            return false;
        }
        if (rule.resource) {
            const patterns = Array.isArray(rule.resource) ? rule.resource : [rule.resource];
            const resources = this.resourceValues(input);
            if (!patterns.some(pattern => resources.some(resource => this.matchesResource(resource, pattern)))) {
                return false;
            }
        }
        return true;
    }

    private resourceValues(input: any): string[] {
        if (typeof input === 'string') {
            return [input];
        }
        if (!input || typeof input !== 'object') {
            return [];
        }
        return RESOURCE_KEYS
            .map(key => input[key])
            .filter(value => typeof value === 'string' && value.length > 0);
    }

    private matchesResource(resource: string, pattern: string): boolean {
        if (pattern === '*') {
            return true;
        }
        if (pattern.startsWith('*') && pattern.endsWith('*') && pattern.length > 1) {
            return resource.includes(pattern.slice(1, -1));
        }
        if (pattern.startsWith('*')) {
            return resource.endsWith(pattern.slice(1));
        }
        if (pattern.endsWith('*')) {
            return resource.startsWith(pattern.slice(0, -1));
        }
        return resource === pattern || resource.endsWith(`/${pattern}`);
    }

    private matchesPattern(toolName: string, pattern: string): boolean {
        if (pattern.endsWith('*')) {
            return toolName.startsWith(pattern.slice(0, -1));
        }
        return toolName === pattern;
    }
}
