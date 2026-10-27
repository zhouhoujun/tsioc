import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AgentGatewayModule } from '../src/agent-gateway.module';
import { GatewayBootstrap } from '../src/gateway/GatewayBootstrap';
import { SessionHandler } from '../src/api/SessionHandler';
import { UsageHandler } from '../src/api/UsageHandler';
import { ChatWebSocket } from '../src/ws/ChatWebSocket';
import { provideAgentOrmStorage } from '@tsdi/agent';

/**
 * `GatewayBootstrap` mounts the REST handlers it receives. Every handler used to
 * be declared as `@Optional() private x?: Handler | null`, which TypeScript emits
 * as `Object`, so the container injected `undefined` and the standalone gateway
 * served no routes at all.
 */
@Suite('gateway handlers are injected into the bootstrap')
export class GatewayHandlerInjectionTest {

    @Test('REST handlers, session/usage collaborators and the websocket bridge are wired')
    async handlersAreInjected() {
        const root = mkdtempSync(join(tmpdir(), 'tsdi-gw-inject-'));
        const ctx = await Application.run(AgentGatewayModule, {
            providers: [...provideAgentOrmStorage(root)]
        });
        try {
            const boot = ctx.get(GatewayBootstrap) as any;
            const missing = ['approvals', 'stats', 'rpc', 'events', 'reviews', 'evals', 'shares', 'chatWs', 'approvalWebhook']
                .filter(name => !boot?.[name]);
            expect(missing).toEqual([]);

            const session = ctx.get(SessionHandler) as any;
            expect(!!session?.memory).toEqual(true);
            expect(!!session?.questionStore).toEqual(true);

            const usage = ctx.get(UsageHandler) as any;
            expect(!!usage?.turnDiagnostics).toEqual(true);

            const ws = ctx.get(ChatWebSocket) as any;
            expect(!!ws?.rpc).toEqual(true);
            expect(!!ws?.audio).toEqual(true);
            expect(!!ws?.quota).toEqual(true);
        } finally {
            await ctx.close();
            rmSync(root, { recursive: true, force: true });
        }
    }
}
