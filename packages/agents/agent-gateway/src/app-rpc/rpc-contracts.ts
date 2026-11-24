import type { AppRpcRequestContext } from '../contracts/AppRpc';
import { listPermissionRules } from './permission-rules';
import { getArtifactFromRpc, listArtifactsFromRpc } from './artifacts-rpc';
import { requireString } from './request-helpers';
import { clearRevertFromRpc, commitRevertFromRpc, stageRevertFromRpc } from './revert-rpc';

/**
 * P0.4: descriptor-based RPC contracts.
 *
 * Each contract owns its params/result shape and handler; the method id list is
 * derived from the registry so capabilities, typed clients and dispatch stay in
 * lockstep. Legacy methods remain in the AppRpcServer switch and are migrated
 * incrementally (new methods must be added here).
 */
export interface AgentRpcContractContext {
    params: any;
    context: AppRpcRequestContext;
    runtime: any;
    authorize(sessionId: string): Promise<void>;
}

export interface AgentRpcContract {
    method: string;
    /** Short description for capabilities/inspection. */
    description: string;
    handler(input: AgentRpcContractContext): Promise<any> | any;
}

/** Literal ids keep `AgentAppRpcMethod` narrow for typed clients. */
export const AGENT_RPC_CONTRACT_METHOD_IDS = [
    'permission.rules.list',
    'artifact.list',
    'artifact.get',
    'session.revert.stage',
    'session.revert.clear',
    'session.revert.commit'
] as const;

type AgentRpcContractMethod = typeof AGENT_RPC_CONTRACT_METHOD_IDS[number];

const CONTRACT_DEFINITIONS: Record<AgentRpcContractMethod, Omit<AgentRpcContract, 'method'>> = {
    'permission.rules.list': {
        description: 'V3 permission rules plus the effective decision for an optional tool probe.',
        handler: ({ params, runtime }) => listPermissionRules(runtime, params)
    },
    'artifact.list': {
        description: 'List artifacts published for a session workspace.',
        handler: ({ params, runtime, authorize }) => listArtifactsFromRpc({ params, runtime, authorize })
    },
    'artifact.get': {
        description: 'Read one artifact manifest.',
        handler: ({ params, runtime, authorize }) => getArtifactFromRpc({
            params, runtime, authorize, id: requireString(params?.id ?? params?.artifactId, 'id')
        })
    },
    'session.revert.stage': {
        description: 'Stage a message-level revert and return the files it would restore.',
        handler: ({ params, runtime, authorize }) => stageRevertFromRpc({ params, runtime, authorize })
    },
    'session.revert.clear': {
        description: 'Clear the staged message-level revert.',
        handler: ({ params, runtime, authorize }) => clearRevertFromRpc({ params, runtime, authorize })
    },
    'session.revert.commit': {
        description: 'Apply the staged message-level revert.',
        handler: ({ params, runtime, authorize }) => commitRevertFromRpc({ params, runtime, authorize })
    }
};

export const AGENT_RPC_CONTRACTS: AgentRpcContract[] = AGENT_RPC_CONTRACT_METHOD_IDS.map(method => ({
    method,
    ...CONTRACT_DEFINITIONS[method]
}));


const CONTRACT_BY_METHOD = new Map(AGENT_RPC_CONTRACTS.map(contract => [contract.method, contract]));

export function resolveAgentRpcContract(method: string): AgentRpcContract | undefined {
    return CONTRACT_BY_METHOD.get(method);
}
