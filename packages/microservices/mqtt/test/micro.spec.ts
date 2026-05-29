import { Application, ApplicationContext } from '@tsdi/core';
import { Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { MqttClient } from '../src';
import { useMqttTransport } from '../src/server';
import { withMqttTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Handle, Payload } from '@tsdi/service';
import { provideClient } from '@tsdi/client';


@Injectable()
export class MQTTService {

    @Handle({ cmd: 'xxx' }, Transport.MQTT)
    async handleMessage(@Payload() message: string) {
        return message;
    }

    @Handle({ cmd: 'ping' }, Transport.MQTT)
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
            useMqttTransport({
                microservice: true,
                bootstrap: false,
                asDefault: true
            })
        ),
        provideClient(
            withMqttTransport({
                microservice: true,
                asDefault: true
            })
        )
    ],
    declarations: [
        MQTTService
    ]
})
export class MicroTestModule {

}


if (process.env.TSIO_TEST_MQTT) describe('MQTT Micro Service', () => {
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(MicroTestModule);
        await new Promise(r => setTimeout(r, 200));
    });

    it('should create context with MQTT transport', () => {
        expect(ctx).toBeDefined();
    });

    it('should resolve MqttClient', () => {
        const client = ctx.get(MqttClient);
        expect(client).toBeDefined();
    });

    it('should resolve MQTTService', () => {
        const svc = ctx.get(MQTTService);
        expect(svc).toBeDefined();
    });

    after(async () => {
        if (ctx) await ctx.destroy();
    });
});
