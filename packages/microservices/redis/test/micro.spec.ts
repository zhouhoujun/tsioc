import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { RedisClient } from '../src';
import { useRedisTransport } from '../src/server';
import { withRedisTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Handle, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';


@Injectable()
export class REDISService {

    @Handle({ cmd: 'xxx' }, Transport.Redis)
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle({ cmd: 'ping' }, Transport.Redis)
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
            useRedisTransport({
                microservice: true,
                bootstrap: false,
                asDefault: true
            })
        ),
        provideClient(
            withRedisTransport({
                microservice: true,
                asDefault: true
            })
        )
    ],
    declarations: [
        REDISService
    ]
})
export class MicroTestModule {

}

if (process.env.TSIO_TEST_REDIS) describe('REDIS Micro Service', () => {
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MicroTestModule);
        
    });

    it('should create context with REDIS transport', () => {
        expect(ctx).toBeDefined();
    });

    it('should resolve RedisClient', () => {
        const client = ctx.get(RedisClient);
        expect(client).toBeDefined();
    });

    it('should resolve REDISService', () => {
        const svc = ctx.get(REDISService);
        expect(svc).toBeDefined();
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });
});
