import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { KafkaClient } from '../src';
import { withKafkaTransport } from '../src/server';
import { withKafkaClientTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, withServiceRouter, Handle, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';


@Injectable()
export class KafkaService {

    @Handle({ cmd: 'xxx' }, Transport.Kafka)
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle({ cmd: 'ping' }, Transport.Kafka)
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
            withKafkaTransport({
                microservice: true,
                bootstrap: false,
                asDefault: true
            })
        ),
        provideClient(
            withKafkaClientTransport({
                microservice: true,
                asDefault: true
            })
        )
    ],
    declarations: [
        KafkaService
    ]
})
export class MicroTestModule {

}

if (process.env.TSIO_TEST_KAFKA) describe('KAFKA Micro Service', () => {
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MicroTestModule);
        await new Promise(r => setTimeout(r, 200));
    });

    it('should create context with KAFKA transport', () => {
        expect(ctx).toBeDefined();
    });

    it('should resolve KafkaClient', () => {
        const client = ctx.get(KafkaClient);
        expect(client).toBeDefined();
    });

    it('should resolve KafkaService', () => {
        const svc = ctx.get(KafkaService);
        expect(svc).toBeDefined();
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });
});
