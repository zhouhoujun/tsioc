import { requireSessionId } from './request-helpers';
import type { AgentRpcRuntime } from './rpc-contracts';

export interface ArtifactRpcInput {
    params: any;
    runtime: AgentRpcRuntime;
    authorize(sessionId: string): Promise<void>;
}

export async function listArtifactsFromRpc(input: ArtifactRpcInput): Promise<any> {
    const sessionId = requireSessionId(input.params);
    await input.authorize(sessionId);
    const artifacts = await input.runtime.listArtifacts?.(sessionId) ?? [];
    return { artifacts };
}

export async function getArtifactFromRpc(input: ArtifactRpcInput & { id: string }): Promise<any> {
    const sessionId = requireSessionId(input.params);
    await input.authorize(sessionId);
    const artifact = await input.runtime.getArtifact?.(sessionId, input.id) ?? null;
    return { artifact };
}
