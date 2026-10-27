import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AgentAppServerModule } from '../src/agent-app-server.module';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';
import { provideAgentOrmStorage } from '@tsdi/agent';

/**
 * `AppRpcServer` declares most of its collaborators as
 * `@Optional() private x?: Store | null`. TypeScript emits `Object` as the
 * design type for such unions, so the container silently injected `undefined`
 * for every one of them and the RPC handlers answered with their "nothing
 * recorded" branch (delegation tree, turn diagnostics, review runs, ...).
 */
@Suite('AppRpcServer receives its optional stores through DI')
export class AppRpcServerInjectionTest {

    @Test('optional store collaborators are injected, not undefined')
    async optionalStoresInjected() {
        const root = mkdtempSync(join(tmpdir(), 'tsdi-apprpc-di-'));
        const ctx = await Application.run(AgentAppServerModule, {
            providers: [...provideAgentOrmStorage(root)]
        });
        try {
            const server = ctx.get(AppRpcServer) as any;
            const missing = [
                'delegation', 'summaryQuality', 'compactionHistory', 'turnDiagnostics',
                'weaknessMiner', 'reviewFindings', 'projectMemory', 'cloudTasks',
                'commandExchange', 'questionStore', 'exchangeMetrics'
            ].filter(name => !server?.[name]);
            expect(missing).toEqual([]);
        } finally {
            await ctx.close();
            rmSync(root, { recursive: true, force: true });
        }
    }
}
