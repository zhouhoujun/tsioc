import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AGENT_APP_RPC_METHODS, AgentAppRpcMethod } from '../src/app-rpc/capabilities';
import { AGENT_RPC_CONTRACTS, AGENT_RPC_CONTRACT_METHOD_IDS, resolveAgentRpcContract } from '../src/app-rpc/rpc-contracts';

@Suite('rpc descriptor contracts')
export class RpcContractsTest {
    @Test('contract ids are part of the capability list exactly once')
    capabilityParity() {
        for (const method of AGENT_RPC_CONTRACT_METHOD_IDS) {
            expect(AGENT_APP_RPC_METHODS.filter(item => item === method).length).toEqual(1);
            expect(resolveAgentRpcContract(method)?.description).toBeTruthy();
        }
        expect(AGENT_RPC_CONTRACTS.length).toEqual(AGENT_RPC_CONTRACT_METHOD_IDS.length);
        const typed: AgentAppRpcMethod = 'artifact.get';
        expect(typed).toEqual('artifact.get');
    }

    @Test('permission contract returns rules from the runtime')
    async permissionRules() {
        const contract = resolveAgentRpcContract('permission.rules.list');
        const runtime = { listPermissionRules: (sessionId: string) => [{ action: 'tool', effect: 'deny', layer: 'workspace', sessionId }] };
        const result = await contract!.handler({ params: { sessionId: 's1' }, context: {} as any, runtime, authorize: async () => undefined });
        expect(result.rules.length).toEqual(1);
    }

    @Test('artifact contracts authorize the session and return manifests')
    async artifactList() {
        const authorized: string[] = [];
        const runtime = { listArtifacts: async (sessionId: string) => [{ id: 'a1', sessionId }] };
        const input = {
            params: { sessionId: 's1' },
            context: {} as any,
            runtime,
            authorize: async (sessionId: string) => { authorized.push(sessionId); }
        };
        const listed = await resolveAgentRpcContract('artifact.list')!.handler(input);
        expect(listed.artifacts[0].id).toEqual('a1');
        expect(authorized).toEqual(['s1']);

        const got = await resolveAgentRpcContract('artifact.get')!.handler({
            ...input,
            params: { sessionId: 's1', id: 'a1' },
            runtime: { getArtifact: async () => ({ id: 'a1' }) }
        });
        expect(got.artifact.id).toEqual('a1');
        expect(authorized).toEqual(['s1', 's1']);
    }
}
