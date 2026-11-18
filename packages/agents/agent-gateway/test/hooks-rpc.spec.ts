import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RandomUuidGenerator } from '@tsdi/core';
import { AGENT_HOOKS_FILE, AGENT_HOOKS_TRUST_FILE, hashAgentHook } from '@tsdi/agent';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

function buildServer(runtime: any, options?: any) {
    return new AppRpcServer(
        runtime,
        new RandomUuidGenerator(),
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        { track: () => undefined } as any,
        {} as any,
        options
    );
}

@Suite('hooks.list RPC for attach/web clients')
export class HooksRpcTest {
    @Test('returns the gateway runtime hook summary')
    async listsHooks() {
        const summary = [{ stage: 'beforeTurn', commands: ['npm test'], functions: [] }];
        const server = buildServer({ getHookSummary: () => summary });
        await expect((server as any).dispatch('hooks.list', {}, {})).resolves.toEqual(summary);
    }

    @Test('returns an empty list when the runtime exposes no summary')
    async emptySummary() {
        const server = buildServer({});
        await expect((server as any).dispatch('hooks.list', {}, {})).resolves.toEqual([]);
    }

    @Test('hooks.trust.list reports the trust state of declared hooks')
    async trustState() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-hooks-trust-'));
        try {
            fs.writeFileSync(path.join(workspace, AGENT_HOOKS_FILE), JSON.stringify({
                beforeTurn: [{ command: 'npm test' }, { command: 'npm run lint' }]
            }));
            fs.writeFileSync(path.join(workspace, AGENT_HOOKS_TRUST_FILE), JSON.stringify({
                version: 1,
                hooks: {
                    [hashAgentHook('beforeTurn', { command: 'npm test' })]: { stage: 'beforeTurn', trustedAt: 7 }
                }
            }));
            const server = buildServer({}, { workspace });
            const entries = await (server as any).dispatch('hooks.trust.list', {}, {});
            expect(entries).toEqual([
                { stage: 'beforeTurn', name: 'npm test', trusted: true, trustedAt: 7 },
                { stage: 'beforeTurn', name: 'npm run lint', trusted: false }
            ]);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
