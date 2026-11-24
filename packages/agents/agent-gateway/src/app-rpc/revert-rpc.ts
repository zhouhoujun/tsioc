import { requireSessionId, requireString } from './request-helpers';

export interface RevertRpcInput {
    params: any;
    runtime: any;
    authorize(sessionId: string): Promise<void>;
}

/** P1.2: preview the files a message revert would restore. */
export async function stageRevertFromRpc(input: RevertRpcInput): Promise<any> {
    const sessionId = requireSessionId(input.params);
    await input.authorize(sessionId);
    const messageId = requireString(input.params?.messageId, 'messageId');
    const paths = Array.isArray(input.params?.paths) ? input.params.paths.map((path: any) => String(path)) : undefined;
    return { staged: await input.runtime.stageSessionRevert?.(sessionId, messageId, paths) ?? null };
}

export async function clearRevertFromRpc(input: RevertRpcInput): Promise<any> {
    const sessionId = requireSessionId(input.params);
    await input.authorize(sessionId);
    return { cleared: await input.runtime.clearStagedSessionRevert?.(sessionId) ?? false };
}

export async function commitRevertFromRpc(input: RevertRpcInput): Promise<any> {
    const sessionId = requireSessionId(input.params);
    await input.authorize(sessionId);
    return { result: await input.runtime.commitStagedSessionRevert?.(sessionId) ?? null };
}
