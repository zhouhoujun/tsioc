import { requireString } from './request-helpers';
import type { AgentRpcRuntime } from './rpc-contracts';

export interface PluginRpcInput {
    params: any;
    runtime: AgentRpcRuntime;
}

export function listPluginsFromRpc(input: PluginRpcInput): any {
    const plugins = input.runtime.plugins?.list?.() ?? [];
    return { plugins };
}

export async function setPluginEnabledFromRpc(input: PluginRpcInput): Promise<any> {
    const id = requireString(input.params?.id, 'id');
    if (typeof input.params?.enabled !== 'boolean') {
        throw new Error('enabled must be a boolean');
    }
    const applied = await input.runtime.plugins?.setEnabled?.(id, input.params.enabled) ?? false;
    return { id, enabled: input.params.enabled, applied };
}
