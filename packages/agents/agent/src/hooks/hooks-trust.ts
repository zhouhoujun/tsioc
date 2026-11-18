import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

/**
 * Hook trust manifest (`hooks.trusted.json`).
 *
 * Hooks declared in `hooks.json` are hashed; the manifest records the trusted
 * hashes so editing a hook definition revokes trust until the CLI re-trusts it.
 * Kept in the agent package (Node-only, not part of `web-entry`) so the CLI,
 * the gateway and any host share one implementation.
 */
export const AGENT_HOOKS_TRUST_FILE = 'hooks.trusted.json';
export const AGENT_HOOKS_FILE = 'hooks.json';
export const AGENT_HOOK_STAGES = ['beforeTurn', 'afterTurn', 'beforeTool', 'afterTool', 'onApproval', 'beforeCompaction', 'afterCompaction'] as const;

export interface AgentHooksTrustFile {
    version: number;
    generatedAt?: number;
    hooks: Record<string, { stage: string; name?: string; trustedAt: number }>;
}

/** One declared hook and whether the trust manifest covers its current hash. */
export interface AgentHookTrustEntry {
    stage: string;
    name?: string;
    trusted: boolean;
    trustedAt?: number;
}

export function canonicalAgentHookValue(value: any): any {
    if (Array.isArray(value)) {
        return value.map(item => canonicalAgentHookValue(item));
    }
    if (value && typeof value === 'object') {
        return Object.keys(value).sort().reduce((result, key) => {
            if (value[key] !== undefined) {
                result[key] = canonicalAgentHookValue(value[key]);
            }
            return result;
        }, {} as Record<string, any>);
    }
    return value;
}

/** Stable hash of a hook definition; `trusted` is deliberately excluded. */
export function hashAgentHook(stage: string, hook: any): string {
    const { trusted: _trusted, ...definition } = hook ?? {};
    return createHash('sha256')
        .update(JSON.stringify({ stage, hook: canonicalAgentHookValue(definition) }))
        .digest('hex');
}

export function readAgentHooksTrust(root: string): AgentHooksTrustFile | undefined {
    const file = path.join(root, AGENT_HOOKS_TRUST_FILE);
    if (!fs.existsSync(file)) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!parsed || typeof parsed !== 'object' || !parsed.hooks || typeof parsed.hooks !== 'object') {
            return undefined;
        }
        return parsed as AgentHooksTrustFile;
    } catch {
        return undefined;
    }
}

/** Read and shape-check `hooks.json` (stages map to one hook or a list). */
export function readAgentHooks(root: string): Record<string, any> | undefined {
    const file = path.join(root, AGENT_HOOKS_FILE);
    if (!fs.existsSync(file)) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Annotate every declared hook with `trusted` and require trust when a
 * manifest exists. Editing a hook changes its hash and revokes trust.
 */
export function applyAgentHooksTrust(hooks: Record<string, any>, trust: AgentHooksTrustFile | undefined): Record<string, any> {
    if (!trust || !Object.keys(trust.hooks || {}).length) {
        return hooks;
    }
    const resolved: Record<string, any> = { ...hooks, requireTrust: true };
    for (const stage of AGENT_HOOK_STAGES) {
        const value = (hooks as any)[stage];
        if (!value) {
            continue;
        }
        const list = Array.isArray(value) ? value : [value];
        resolved[stage] = list.map((hook: any) => hook && typeof hook === 'object'
            ? { ...hook, trusted: !!trust.hooks[hashAgentHook(stage, hook)] }
            : hook);
    }
    return resolved;
}

/** Declared hooks with their current trust state (gateway settings/RPC). */
export function resolveAgentHooksTrustState(root: string): AgentHookTrustEntry[] {
    const hooks = readAgentHooks(root);
    if (!hooks) {
        return [];
    }
    const trust = readAgentHooksTrust(root);
    const entries: AgentHookTrustEntry[] = [];
    for (const stage of AGENT_HOOK_STAGES) {
        const value = (hooks as any)[stage];
        const list = value ? (Array.isArray(value) ? value : [value]) : [];
        for (const hook of list) {
            if (!hook || typeof hook !== 'object') {
                continue;
            }
            const record = trust?.hooks?.[hashAgentHook(stage, hook)];
            const name = String(hook.name || hook.command || hook.url || '').trim();
            entries.push({
                stage,
                ...(name ? { name } : {}),
                trusted: !!record,
                ...(record?.trustedAt ? { trustedAt: record.trustedAt } : {})
            });
        }
    }
    return entries;
}
