import * as path from 'path';
import * as fs from 'fs';
import { createHash } from 'crypto';
import { AgentHooksOptions } from '@tsdi/agent';
import { resolveAgentToolDiscovery } from '@tsdi/agent-tools';

export const AGENT_HOOKS_TRUST_FILE = 'hooks.trusted.json';
export const AGENT_HOOKS_FILE = 'hooks.json';
import type { AgentHooksOptions as HookOptions } from '@tsdi/agent';
export const AGENT_HOOK_STAGES = ['beforeTurn', 'afterTurn', 'beforeTool', 'afterTool', 'onApproval', 'beforeCompaction', 'afterCompaction'] as const;

interface AgentHookTrustFile {
    version: number;
    generatedAt?: number;
    hooks: Record<string, { stage: string; name?: string; trustedAt: number }>;
}

function canonicalAgentHookValue(value: any): any {
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

function readAgentHookTrust(root: string): AgentHookTrustFile | undefined {
    const file = path.join(root, AGENT_HOOKS_TRUST_FILE);
    if (!fs.existsSync(file)) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!parsed || typeof parsed !== 'object' || !parsed.hooks || typeof parsed.hooks !== 'object') {
            return undefined;
        }
        return parsed as AgentHookTrustFile;
    } catch {
        return undefined;
    }
}

/** Write a trust manifest for every hook currently declared in `hooks.json`. */
export function writeAgentHookTrust(root?: string): { path: string; count: number } {
    const resolvedRoot = path.resolve(root || resolveAgentToolDiscovery(root).root);
    let hooks: AgentHooksOptions | undefined;
    try {
        const file = path.join(resolvedRoot, AGENT_HOOKS_FILE);
        hooks = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined;
    } catch {
        hooks = undefined;
    }
    const trust: AgentHookTrustFile = { version: 1, generatedAt: Date.now(), hooks: {} };
    if (hooks && typeof hooks === 'object') {
        for (const stage of AGENT_HOOK_STAGES) {
            const value = (hooks as any)[stage];
            const list = value ? (Array.isArray(value) ? value : [value]) : [];
            for (const hook of list) {
                if (!hook || typeof hook !== 'object') {
                    continue;
                }
                trust.hooks[hashAgentHook(stage, hook)] = {
                    stage,
                    name: String(hook.name || hook.command || hook.url || '').trim() || undefined,
                    trustedAt: Date.now()
                };
            }
        }
    }
    const file = path.join(resolvedRoot, AGENT_HOOKS_TRUST_FILE);
    fs.mkdirSync(resolvedRoot, { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(trust, null, 2)}\n`);
    return { path: file, count: Object.keys(trust.hooks).length };
}

/**
 * Enforce a trust manifest when present. Editing hooks.json changes the hash
 * and therefore revokes trust until `tsdi-agent hooks trust` is run again.
 */
export function applyAgentHookTrust(hooks: AgentHooksOptions, root?: string): AgentHooksOptions {
    const resolvedRoot = path.resolve(root || resolveAgentToolDiscovery(root).root);
    const trust = readAgentHookTrust(resolvedRoot);
    if (!trust || !Object.keys(trust.hooks).length) {
        return hooks;
    }
    const resolved: AgentHooksOptions = { ...hooks, requireTrust: true };
    for (const stage of AGENT_HOOK_STAGES) {
        const value = (hooks as any)[stage];
        if (!value) {
            continue;
        }
        const list = Array.isArray(value) ? value : [value];
        (resolved as any)[stage] = list.map((hook: any) => hook && typeof hook === 'object'
            ? { ...hook, trusted: !!trust.hooks[hashAgentHook(stage, hook)] }
            : hook);
    }
    return resolved;
}

/** Load hooks.json and apply the trust manifest when one exists. */
export function resolveCliHooks(root?: string): AgentHooksOptions | undefined {
    const resolvedRoot = path.resolve(root || resolveAgentToolDiscovery(root).root);
    const file = path.join(resolvedRoot, AGENT_HOOKS_FILE);
    if (!fs.existsSync(file)) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? applyAgentHookTrust(parsed, resolvedRoot)
            : undefined;
    } catch {
        return undefined;
    }
}
