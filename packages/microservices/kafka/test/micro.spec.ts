import { createInjector, Injectable, Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { KafkaClient } from '../src';
import { useKafkaTransport } from '../src/server';
import { withKafkaTransport } from '../src/client';
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Handle, Payload } from '@tsdi/service';
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
            useRouter(),
            useKafkaTransport({
                microservice: true,
                bootstrap: false,
                asDefault: true
            })
        ),
        provideClient(
            withKafkaTransport({
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

describe('KAFKA Micro Service', () => {
    it('should compose providers for Kafka transport without bootstrapping a broker connection', () => {
        const providers = [
            ...provideService(
                useRouter(),
                ...useKafkaTransport({
                    microservice: true,
                    bootstrap: false,
                    asDefault: true
                })
            ),
            ...provideClient(
                ...withKafkaTransport({
                    microservice: true,
                    asDefault: true
                })
            )
        ];
        const injector = createInjector(providers as any);
        expect(injector).toBeDefined();
    });

    it('should resolve KafkaClient', () => {
        const providers = provideClient(
            ...withKafkaTransport({
                microservice: true,
                asDefault: true
            })
        );
        const injector = createInjector(providers as any);
        const client = injector.get(KafkaClient);
        expect(client).toBeDefined();
    });

    it('should keep module metadata intact', () => {
        expect(MicroTestModule).toBeDefined();
        expect(KafkaService).toBeDefined();
    });
});
