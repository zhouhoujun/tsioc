import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { UdpClient } from '../src';
import { useUdpTransport } from '../src/server';
import { withUdpTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Handle, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';


@Injectable()
export class UdpService {

    @Handle({ cmd: 'xxx' }, Transport.UDP)
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle({ cmd: 'ping' }, Transport.UDP)
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
            useUdpTransport({
                microservice: true,
                bootstrap: false,
                asDefault: true
            })
        ),
        provideClient(
            withUdpTransport({
                microservice: true,
                asDefault: true
            })
        )
    ],
    declarations: [
        UdpService
    ]
})
export class MicroTestModule {

}


describe('Udp Micro Service', () => {
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MicroTestModule);
        await new Promise(r => setTimeout(r, 200));
    });

    it('should create context with UDP transport', () => {
        expect(ctx).toBeDefined();
    });

    it('should resolve UdpClient', () => {
        const client = ctx.get(UdpClient);
        expect(client).toBeDefined();
    });

    it('should resolve UdpService', () => {
        const svc = ctx.get(UdpService);
        expect(svc).toBeDefined();
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });
});
