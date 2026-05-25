import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { TcpClient } from '../src';
import { withTcpTransport } from '../src/server';
import { withTcpClientTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, withServiceRouter, Handle, Payload } from '@tsdi/service';
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
            withServiceRouter(),
            withTcpTransport({
                microservice: true,
                listenOpts: { port: 11900, host: '127.0.0.1' },
                bootstrap: false,
                asDefault: true
            })
        ),
        provideClient(
            withTcpClientTransport({
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


describe('Tcp Micro Service', () => {
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
