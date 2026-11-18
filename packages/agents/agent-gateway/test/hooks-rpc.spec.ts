import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

function buildServer(runtime: any) {
    return new AppRpcServer(
        runtime,
        new RandomUuidGenerator(),
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        { track: () => undefined } as any,
        {} as any
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
}
