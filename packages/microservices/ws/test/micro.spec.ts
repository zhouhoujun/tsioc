import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { WsClient } from '../src';
import { useWsTransport } from '../src/server';
import { withWsTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Handle, Payload } from '@tsdi/service';
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
        provideService(
            useRouter(),
            useWsTransport({
                microservice: true,
                bootstrap: false,
                asDefault: true
            })
        ),
        provideClient(
            withWsTransport({
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
        if (ctx) await ctx.close();
    });
});
