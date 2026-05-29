import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { CoapClient } from '../src';
import { useCoapTransport } from '../src/server';
import { withCoapTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Handle, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';


@Injectable()
export class COAPService {

    @Handle({ cmd: 'xxx' }, Transport.CoAP)
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle({ cmd: 'ping' }, Transport.CoAP)
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
            useCoapTransport({
                microservice: true,
                bootstrap: false,
                asDefault: true
            })
        ),
        provideClient(
            withCoapTransport({
                microservice: true,
                asDefault: true
            })
        )
    ],
    declarations: [
        COAPService
    ]
})
export class MicroTestModule {

}


describe('COAP Micro Service', () => {
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MicroTestModule);
        await new Promise(r => setTimeout(r, 200));
    });

    it('should create context with COAP transport', () => {
        expect(ctx).toBeDefined();
    });

    it('should resolve CoapClient', () => {
        const client = ctx.get(CoapClient);
        expect(client).toBeDefined();
    });

    it('should resolve COAPService', () => {
        const svc = ctx.get(COAPService);
        expect(svc).toBeDefined();
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });
});
