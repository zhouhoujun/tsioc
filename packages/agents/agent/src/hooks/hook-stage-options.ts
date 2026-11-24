import type { AgentHookDefinition, AgentHookStageOptions, AgentHooksOptions, AgentLifecycleHookStage } from './AgentHooks';
import { canonicalHookStage } from './AgentHooks';

const STAGE_KEYS = new Set<string>([
    'beforeTurn', 'afterTurn', 'beforeTool', 'afterTool', 'onApproval', 'beforeCompaction', 'afterCompaction',
    'tool.execute.before', 'tool.execute.after', 'permission.evaluate', 'model.request', 'model.response', 'config.observe'
]);

/** Merge canonical + alias option keys into one canonical map (alias entries append). */
export function collectStageOptions(hooks?: AgentHooksOptions): AgentHookStageOptions {
    const collected: AgentHookStageOptions = {};
    for (const key of Object.keys(hooks ?? {}) as AgentLifecycleHookStage[]) {
        const value = hooks?.[key];
        if (!STAGE_KEYS.has(key) || !value || typeof value !== 'object') {
            continue;
        }
        const stage = canonicalHookStage(key);
        collected[stage] = [...((collected[stage] as AgentHookDefinition[]) ?? []), ...(Array.isArray(value) ? value : [value]) as AgentHookDefinition[]];
    }
    return collected;
}
