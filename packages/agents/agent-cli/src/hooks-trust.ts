import * as path from 'path';
import * as fs from 'fs';
import { AgentHooksOptions } from '@tsdi/agent';
import { resolveAgentToolDiscovery } from '@tsdi/agent-tools';
import {
    AGENT_HOOKS_FILE,
    AGENT_HOOKS_TRUST_FILE,
    AGENT_HOOK_STAGES,
    AgentHooksTrustFile,
    applyAgentHooksTrust,
    hashAgentHook,
    readAgentHooks,
    readAgentHooksTrust
} from '@tsdi/agent';

export {
    AGENT_HOOKS_FILE,
    AGENT_HOOKS_TRUST_FILE,
    AGENT_HOOK_STAGES,
    hashAgentHook,
    readAgentHooksTrust
};
export type { AgentHooksTrustFile };

/** Write a trust manifest for every hook currently declared in `hooks.json`. */
export function writeAgentHookTrust(root?: string): { path: string; count: number } {
    const resolvedRoot = path.resolve(root || resolveAgentToolDiscovery(root).root);
    const hooks = readAgentHooks(resolvedRoot);
    const trust: AgentHooksTrustFile = { version: 1, generatedAt: Date.now(), hooks: {} };
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

/** Enforce a trust manifest when present (shared implementation). */
export function applyAgentHookTrust(hooks: AgentHooksOptions, root?: string): AgentHooksOptions {
    const resolvedRoot = path.resolve(root || resolveAgentToolDiscovery(root).root);
    return applyAgentHooksTrust(hooks as any, readAgentHooksTrust(resolvedRoot)) as AgentHooksOptions;
}

/** Load hooks.json and apply the trust manifest when one exists. */
export function resolveCliHooks(root?: string): AgentHooksOptions | undefined {
    const resolvedRoot = path.resolve(root || resolveAgentToolDiscovery(root).root);
    const parsed = readAgentHooks(resolvedRoot);
    return parsed ? applyAgentHookTrust(parsed as AgentHooksOptions, resolvedRoot) : undefined;
}
