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

export interface AgentRpcSchema {
    type: 'object';
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
}

export interface AgentRpcContract {
    method: string;
    /** Short description for capabilities/inspection. */
    description: string;
    /** P3.2: machine-readable params/result schemas (generated into app.capabilities). */
    paramsSchema?: AgentRpcSchema;
    resultSchema?: AgentRpcSchema;
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
        paramsSchema: { type: 'object', properties: { sessionId: { type: 'string' }, tool: { type: 'string' }, resource: { type: 'string' }, input: { type: 'object' } } },
        resultSchema: { type: 'object', properties: { rules: { type: 'array' }, decision: { type: 'object' } }, required: ['rules'] },
        handler: ({ params, runtime }) => listPermissionRules(runtime, params)
    },
    'artifact.list': {
        description: 'List artifacts published for a session workspace.',
        paramsSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] },
        resultSchema: { type: 'object', properties: { artifacts: { type: 'array' } }, required: ['artifacts'] },
        handler: ({ params, runtime, authorize }) => listArtifactsFromRpc({ params, runtime, authorize })
    },
    'artifact.get': {
        description: 'Read one artifact manifest.',
        paramsSchema: { type: 'object', properties: { sessionId: { type: 'string' }, id: { type: 'string' } }, required: ['sessionId', 'id'] },
        resultSchema: { type: 'object', properties: { artifact: { type: 'object' } } },
        handler: ({ params, runtime, authorize }) => getArtifactFromRpc({
            params, runtime, authorize, id: requireString(params?.id ?? params?.artifactId, 'id')
        })
    },
    'session.revert.stage': {
        description: 'Stage a message-level revert and return the files it would restore.',
        paramsSchema: { type: 'object', properties: { sessionId: { type: 'string' }, messageId: { type: 'string' }, paths: { type: 'array' } }, required: ['sessionId', 'messageId'] },
        resultSchema: { type: 'object', properties: { staged: { type: 'object' } } },
        handler: ({ params, runtime, authorize }) => stageRevertFromRpc({ params, runtime, authorize })
    },
    'session.revert.clear': {
        description: 'Clear the staged message-level revert.',
        paramsSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] },
        resultSchema: { type: 'object', properties: { cleared: { type: 'boolean' } }, required: ['cleared'] },
        handler: ({ params, runtime, authorize }) => clearRevertFromRpc({ params, runtime, authorize })
    },
    'session.revert.commit': {
        description: 'Apply the staged message-level revert.',
        paramsSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] },
        resultSchema: { type: 'object', properties: { result: { type: 'object' } } },
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

/** P3.2: descriptor-derived contract schemas advertised by `app.capabilities`. */
export function buildAgentRpcContractSchemas() {
    return {
        contractVersion: 1,
        methods: Object.fromEntries(AGENT_RPC_CONTRACTS.map(contract => [contract.method, {
            description: contract.description,
            params: contract.paramsSchema ?? { type: 'object' as const },
            result: contract.resultSchema ?? { type: 'object' as const }
        }]))
    };
}

/** P4: standalone JSON Schema document derived from the same descriptors. */
export function buildAgentRpcJsonSchema() {
    const methods = Object.fromEntries(AGENT_RPC_CONTRACTS.map(contract => [contract.method, {
        description: contract.description,
        params: contract.paramsSchema ?? { type: 'object' as const },
        result: contract.resultSchema ?? { type: 'object' as const }
    }]));
    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'https://tsdi.dev/schemas/agent-rpc.json',
        title: 'TSDI Agent JSON-RPC',
        protocolVersion: 1,
        contractVersion: 1,
        methods
    };
}
