import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { WsClient } from '../src';
import { withWsTransport } from '../src/server';
import { withWsClientTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, withServiceRouter, Handle, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';


@Injectable()
export class WSService {

    @Handle({ cmd: 'xxx' }, Transport.WS)
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle({ cmd: 'ping' }, Transport.WS)
    async ping() {
        return 'pong';
    }
}

@Module({
    baseURL: __dirname,
    imports: [
        LoggerModule,
    ],
    providers: [
        ...provideService(
            withServiceRouter(),
            withWsTransport({
                microservice: true,
                bootstrap: false,
                asDefault: true
            })
        ),
        ...provideClient(
            withWsClientTransport({
                microservice: true,
                asDefault: true
            })
        )
    ],
    declarations: [
        WSService
    ]
})
export class MicroTestModule {

}


describe('WS Micro Service', () => {
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MicroTestModule);
        await new Promise(r => setTimeout(r, 200));
    });

    it('should create context with WS transport', () => {
        expect(ctx).toBeDefined();
    });

    it('should resolve WsClient', () => {
        const client = ctx.get(WsClient);
        expect(client).toBeDefined();
    });

    it('should resolve WSService', () => {
        const svc = ctx.get(WSService);
        expect(svc).toBeDefined();
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });
});
