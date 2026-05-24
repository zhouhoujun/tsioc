import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { NatsClient } from '../src';
import { withNatsTransport } from '../src/server';
import { withNatsClientTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, withServiceRouter, Handle, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';


@Injectable()
export class NATSService {

    @Handle({ cmd: 'xxx' }, Transport.NATS)
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle({ cmd: 'ping' }, Transport.NATS)
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
            withNatsTransport({
                microservice: true,
                bootstrap: false,
                asDefault: true
            })
        ),
        ...provideClient(
            withNatsClientTransport({
                microservice: true,
                asDefault: true
            })
        )
    ],
    declarations: [
        NATSService
    ]
})
export class MicroTestModule {

}


describe('NATS Micro Service', () => {
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MicroTestModule);
        await new Promise(r => setTimeout(r, 200));
    });

    it('should create context with NATS transport', () => {
        expect(ctx).toBeDefined();
    });

    it('should resolve NatsClient', () => {
        const client = ctx.get(NatsClient);
        expect(client).toBeDefined();
    });

    it('should resolve NATSService', () => {
        const svc = ctx.get(NATSService);
        expect(svc).toBeDefined();
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });
});
