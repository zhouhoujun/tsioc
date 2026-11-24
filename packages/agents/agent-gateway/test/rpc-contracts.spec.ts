import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AGENT_APP_RPC_METHODS, AgentAppRpcMethod, buildAgentAppRpcCapabilities } from '../src/app-rpc/capabilities';
import { AGENT_RPC_CONTRACTS, AGENT_RPC_CONTRACT_METHOD_IDS, buildAgentRpcContractSchemas, buildAgentRpcJsonSchema, resolveAgentRpcContract } from '../src/app-rpc/rpc-contracts';

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

    @Test('contract schemas are advertised with the capability payload')
    contractSchemas() {
        const schemas = buildAgentRpcContractSchemas();
        expect(schemas.contractVersion).toEqual(1);
        for (const contract of AGENT_RPC_CONTRACTS) {
            const entry = schemas.methods[contract.method];
            expect(entry).toBeTruthy();
            expect(entry.params.type).toEqual('object');
            expect(entry.result.type).toEqual('object');
            for (const required of contract.paramsSchema?.required ?? []) {
                expect(Object.keys(contract.paramsSchema?.properties ?? {})).toContain(required);
            }
        }
        const capabilities = buildAgentAppRpcCapabilities();
        expect(capabilities.protocolVersion).toEqual(1);
        expect(capabilities.contractSchemas.methods['session.revert.stage']).toBeTruthy();
        expect(capabilities.methods).toEqual(AGENT_APP_RPC_METHODS);

        const document = buildAgentRpcJsonSchema();
        expect(document.$schema).toContain('json-schema.org');
        expect(document.contractVersion).toEqual(1);
        expect(Object.keys(document.methods)).toEqual([...AGENT_RPC_CONTRACT_METHOD_IDS]);
        expect(document.methods['artifact.list'].params.required).toEqual(['sessionId']);
    }

    @Test('handlers tolerate unknown fields for forward compatibility')
    async unknownFields() {
        const contract = resolveAgentRpcContract('permission.rules.list')!;
        const result = await contract.handler({
            params: { sessionId: 's1', unknownFlag: true, nested: { a: 1 } },
            context: {} as any,
            runtime: { listPermissionRules: () => [] },
            authorize: async () => undefined
        });
        expect(result.rules).toEqual([]);
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

    @Test('revert contracts stage, clear and commit through the runtime')
    async revertContracts() {
        const authorized: string[] = [];
        const calls: string[] = [];
        const runtime = {
            stageSessionRevert: async (sessionId: string, messageId: string) => { calls.push(`stage:${sessionId}:${messageId}`); return { messageId, files: ['a.txt'], restoreOrder: 'reverse' }; },
            clearStagedSessionRevert: async (sessionId: string) => { calls.push(`clear:${sessionId}`); return true; },
            commitStagedSessionRevert: async (sessionId: string) => { calls.push(`commit:${sessionId}`); return { reverted: true, restoredFiles: 1 }; }
        };
        const input = { params: { sessionId: 's1', messageId: 'm1' }, context: {} as any, runtime, authorize: async (id: string) => { authorized.push(id); } };
        const staged = await resolveAgentRpcContract('session.revert.stage')!.handler(input);
        expect(staged.staged.files).toEqual(['a.txt']);
        expect((await resolveAgentRpcContract('session.revert.clear')!.handler(input)).cleared).toEqual(true);
        expect((await resolveAgentRpcContract('session.revert.commit')!.handler(input)).result.reverted).toEqual(true);
        expect(calls).toEqual(['stage:s1:m1', 'clear:s1', 'commit:s1']);
        expect(authorized).toEqual(['s1', 's1', 's1']);
    }
}
