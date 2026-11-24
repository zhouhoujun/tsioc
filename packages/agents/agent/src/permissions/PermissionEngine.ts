import type { ApprovalCategory, ApprovalCategoryMetadata } from '../tools/approval-categories';
import { classifyApprovalCategory } from '../tools/approval-categories';
import type { ApprovalRule, ApprovalRuleObject } from '../tools/ApprovalStrategy';

/**
 * P1.1: permission rules as `action + resource -> effect`.
 *
 * Actions cover both the tool name (`tool`) and the semantic classes opencode
 * uses (`read`, `edit`, `external_directory`, `shell`, `skill`, `mcp`,
 * `provider.use`). Effects are `allow`, `ask` or `deny`; matching is
 * last-match-wins across ordered layers, while a matched `deny` is a hard
 * floor that later allows cannot override.
 */
export type PermissionAction =
    | 'read'
    | 'edit'
    | 'external_directory'
    | 'shell'
    | 'skill'
    | 'mcp'
    | 'provider.use'
    | 'tool'
    | (string & {});

export type PermissionEffect = 'allow' | 'ask' | 'deny';

export type PermissionLayer = 'default' | 'workspace' | 'session' | 'agent' | 'saved';

export const PERMISSION_LAYERS: PermissionLayer[] = ['default', 'workspace', 'session', 'agent', 'saved'];

export interface PermissionRule {
    action: PermissionAction;
    /** Glob matched against the tool name (`action: 'tool'`) or the request resources. */
    resource?: string;
    effect: PermissionEffect;
    /** Optional tool name/glob constraint, used when compiling legacy category rules. */
    tool?: string;
    /** Layer the rule belongs to; filled in by the engine. */
    layer?: PermissionLayer;
    /** Human-readable origin (legacy rule/category) for inspection. */
    from?: string;
}

export interface PermissionRequest {
    tool: string;
    input?: any;
    sessionId?: string;
    /** Extra resources (paths/commands/urls) derived by the caller. */
    resources?: string[];
    /** Extra semantic actions (e.g. `external_directory`) derived by the caller. */
    actions?: PermissionAction[];
    category?: ApprovalCategory;
    metadata?: ApprovalCategoryMetadata;
}

export interface PermissionDecision {
    effect?: PermissionEffect;
    rule?: PermissionRule;
    layer?: PermissionLayer;
    matched: boolean;
    /** A matched deny is a hard floor. */
    denied: boolean;
    actions: PermissionAction[];
    resources: string[];
}

const RESOURCE_KEYS = ['path', 'filePath', 'target', 'command', 'cmd', 'url', 'cwd', 'pattern', 'query'];

/** Glob match (`*` any run, `?` one char); bare relative paths also match suffixes. */
export function matchPermissionPattern(pattern: string, value: string): boolean {
    const source = String(pattern ?? '').trim();
    const target = String(value ?? '');
    if (!source || source === '*') {
        return true;
    }
    const escaped = source
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    if (new RegExp(`^${escaped}$`).test(target)) {
        return true;
    }
    if (!source.includes('*') && !source.includes('?')) {
        return target === source || target.endsWith(`/${source}`) || target.endsWith(`\\${source}`);
    }
    return false;
}

/** Semantic actions derived from the tool name/category, always including the tool name action. */
export function resolvePermissionActions(request: PermissionRequest): PermissionAction[] {
    const tool = String(request.tool ?? '');
    const category = request.category ?? classifyApprovalCategory(tool, request.metadata);
    const actions = new Set<PermissionAction>(request.actions ?? []);
    actions.add(tool);
    actions.add('tool');
    if (category === 'sandbox') {
        actions.add('shell');
    } else if (category === 'skill') {
        actions.add('skill');
    } else if (category === 'mcp') {
        actions.add('mcp');
    } else if (category === 'fs') {
        actions.add(/^(read_file|list_files|glob|grep|read_skill)$/.test(tool) ? 'read' : 'edit');
    }
    if (/^(read_file|list_files|list_dir|glob|grep|read_skill)$/.test(tool)) {
        actions.add('read');
    } else if (/^(write_file|edit_file|apply_patch|delete_file|move_file|copy_file|mkdir|lsp_format)$/.test(tool)) {
        actions.add('edit');
    }
    if (tool.startsWith('provider.')) {
        actions.add('provider.use');
    }
    if (tool.startsWith('artifact_')) {
        actions.add('artifact');
    }
    return Array.from(actions);
}

export function resolvePermissionResources(request: PermissionRequest): string[] {
    if (request.resources?.length) {
        return request.resources.slice();
    }
    const input = request.input;
    if (typeof input === 'string') {
        return [input];
    }
    if (!input || typeof input !== 'object') {
        return [];
    }
    const values = RESOURCE_KEYS
        .map(key => input[key])
        .filter((value): value is string => typeof value === 'string' && value.length > 0);
    return Array.from(new Set(values));
}

/**
 * Compile legacy `ApprovalRule` entries into v3 rules for a layer. Category
 * rules keep their names as a `tool` constraint and resources as globs.
 */
export function compileApprovalRules(rules: ApprovalRule[] | undefined, layer: PermissionLayer): PermissionRule[] {
    const compiled: PermissionRule[] = [];
    for (const rule of rules ?? []) {
        if (typeof rule === 'string') {
            compiled.push({ action: 'tool', resource: rule, effect: 'ask', layer, from: rule });
            continue;
        }
        if (!rule || typeof rule !== 'object') {
            continue;
        }
        const effect = rule.action ?? (rule.mode === 'auto-deny' ? 'deny' : 'ask');
        const resources = rule.resource === undefined
            ? [undefined]
            : (Array.isArray(rule.resource) ? rule.resource : [rule.resource]);
        const tools = rule.names?.length ? rule.names : [undefined];
        for (const resource of resources) {
            for (const tool of tools) {
                compiled.push({
                    action: actionForRule(rule),
                    ...(resource !== undefined ? { resource } : {}),
                    ...(tool !== undefined ? { tool } : {}),
                    effect,
                    layer,
                    from: rule.category
                });
            }
        }
    }
    return compiled;
}

/** Compile durable "always allow" tool patterns into the saved layer. */
export function compileSavedAllowPatterns(patterns: string[] | undefined): PermissionRule[] {
    return (patterns ?? [])
        .map(pattern => String(pattern || '').trim())
        .filter(Boolean)
        .map(pattern => ({ action: 'tool' as PermissionAction, resource: pattern, effect: 'allow' as PermissionEffect, layer: 'saved' as PermissionLayer }));
}

function actionForRule(rule: ApprovalRuleObject): PermissionAction {
    switch (rule.category) {
        case 'sandbox':
            return 'shell';
        case 'skill':
            return 'skill';
        case 'mcp':
            return 'mcp';
        case 'fs':
            return (rule.names ?? []).length
                && (rule.names ?? []).every(name => /^(read_file|list_files|glob|grep)$/.test(name))
                ? 'read'
                : 'edit';
        default:
            return 'tool';
    }
}

function matchesRule(rule: PermissionRule, request: PermissionRequest, actions: PermissionAction[], resources: string[]): boolean {
    if (rule.action !== '*' && !actions.includes(rule.action)) {
        return false;
    }
    if (rule.tool && !matchPermissionPattern(rule.tool, request.tool)) {
        return false;
    }
    if (rule.resource === undefined || rule.resource === '*') {
        return true;
    }
    // `action: 'tool'` rules match the tool name; semantic rules match input resources.
    if (rule.action === 'tool') {
        return matchPermissionPattern(rule.resource, request.tool);
    }
    return resources.some(resource => matchPermissionPattern(rule.resource!, resource));
}

/**
 * Ordered multi-layer rule tables. Layers are evaluated default → workspace →
 * session → agent → saved; later matches win, and any matched deny hardens the
 * decision regardless of later allows.
 */
export class PermissionEngine {
    private readonly layers = new Map<PermissionLayer, PermissionRule[]>();
    private readonly providers = new Map<PermissionLayer, (request: PermissionRequest) => PermissionRule[] | undefined>();

    setLayer(layer: PermissionLayer, rules: PermissionRule[]): void {
        this.layers.set(layer, rules.map(rule => ({ ...rule, layer })));
    }

    /** Dynamic layer (e.g. the session's archetype deny list) merged after static rules. */
    setLayerProvider(layer: PermissionLayer, provider: ((request: PermissionRequest) => PermissionRule[] | undefined) | undefined): void {
        if (provider) this.providers.set(layer, provider); else this.providers.delete(layer);
    }

    getLayer(layer: PermissionLayer): PermissionRule[] {
        return [...(this.layers.get(layer) ?? [])];
    }

    list(): PermissionRule[] {
        return PERMISSION_LAYERS.flatMap(layer => this.getLayer(layer));
    }

    hasRules(): boolean {
        return PERMISSION_LAYERS.some(layer => (this.layers.get(layer)?.length ?? 0) > 0);
    }

    evaluate(request: PermissionRequest): PermissionDecision {
        const actions = resolvePermissionActions(request);
        const resources = resolvePermissionResources(request);
        let effect: PermissionEffect | undefined;
        let rule: PermissionRule | undefined;
        let layer: PermissionLayer | undefined;
        let denied = false;
        for (const name of PERMISSION_LAYERS) {
            let dynamic: PermissionRule[] = [];
            const provider = this.providers.get(name);
            if (provider) {
                try {
                    dynamic = (provider(request) ?? []).map(rule => ({ ...rule, layer: name }));
                } catch {
                    dynamic = [];
                }
            }
            for (const candidate of [...(this.layers.get(name) ?? []), ...dynamic]) {
                if (!matchesRule(candidate, request, actions, resources)) {
                    continue;
                }
                effect = candidate.effect;
                rule = candidate;
                layer = name;
                if (candidate.effect === 'deny') {
                    denied = true;
                }
            }
        }
        return { effect, rule, layer, matched: effect !== undefined, denied, actions, resources };
    }

    explain(request: PermissionRequest): PermissionDecision {
        return this.evaluate(request);
    }
}
