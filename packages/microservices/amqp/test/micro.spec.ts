import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { AmqpClient } from '../src';
import { useAmqpTransport } from '../src/server';
import { withAmqpTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Handle, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';


@Injectable()
export class AMQPService {

    @Handle({ cmd: 'xxx' }, Transport.AMQP)
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle({ cmd: 'ping' }, Transport.AMQP)
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
            useAmqpTransport({
                microservice: true,
                bootstrap: false,
                asDefault: true
            })
        ),
        provideClient(
            withAmqpTransport({
                microservice: true,
                asDefault: true
            })
        )
    ],
    declarations: [
        AMQPService
    ]
})
export class MicroTestModule {

}


if (process.env.TSIO_TEST_AMQP) describe('AMQP Micro Service', () => {
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MicroTestModule);
        
    });

    it('should create context with AMQP transport', () => {
        expect(ctx).toBeDefined();
    });

    it('should resolve AmqpClient', () => {
        const client = ctx.get(AmqpClient);
        expect(client).toBeDefined();
    });

    it('should resolve AMQPService', () => {
        const svc = ctx.get(AMQPService);
        expect(svc).toBeDefined();
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });
});
