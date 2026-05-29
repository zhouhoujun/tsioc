import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { TcpClient } from '../src';
import { useTcpTransport } from '../src/server';
import { withTcpTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Handle, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';


@Injectable()
export class TcpService {

    @Handle({ cmd: 'xxx' }, Transport.TCP)
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle({ cmd: 'ping' }, Transport.TCP)
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
            useTcpTransport({
                microservice: true,
                listenOpts: { port: 11900, host: '127.0.0.1' },
                bootstrap: false,
                asDefault: true
            })
        ),
        provideClient(
            withTcpTransport({
                microservice: true,
                connectOpts: { port: 11900, host: '127.0.0.1' },
                asDefault: true
            })
        )
    ],
    declarations: [
        TcpService
    ]
})
export class MicroTestModule {

}


if (process.env.TSIO_TEST_TCP) describe('Tcp Micro Service', () => {
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MicroTestModule);
        await new Promise(r => setTimeout(r, 200));
    });

    it('should create context with TCP transport', () => {
        expect(ctx).toBeDefined();
    });

    it('should resolve TcpClient', () => {
        const client = ctx.get(TcpClient);
        expect(client).toBeDefined();
    });

    it('should resolve TcpService', () => {
        const svc = ctx.get(TcpService);
        expect(svc).toBeDefined();
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });
});
