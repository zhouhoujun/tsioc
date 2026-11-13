import expect = require('expect');
import * as path from 'node:path';
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Handle, Payload, provideService, useRouter } from '@tsdi/service';
import { Transport } from '@tsdi/common';
import { provideClient } from '@tsdi/client';
import { lastValueFrom } from 'rxjs';
import { GrpcServer } from '../src/server/grpc-server';
import { useGrpcTransport } from '../src/server/factory';
import { GrpcClient } from '../src/client/client';
import { withGrpcTransport } from '../src/client/factory';

const PROTO_PATH = path.resolve(__dirname, 'fixtures/greeter.proto');

@Controller('/grpc')
class GreeterController {
    @Handle('/grpc.test.Greeter/SayHello', Transport.gRPC)
    sayHello(@Payload('name') name: string) {
        return { message: `hello ${name ?? 'world'}` };
    }
}

@Module({
    imports: [LoggerModule],
    declarations: [GreeterController],
    providers: [
        provideService(
            useRouter(),
            useGrpcTransport({
                port: 0,
                host: '127.0.0.1',
                protoPath: PROTO_PATH,
                packageName: 'grpc.test',
                serviceName: 'Greeter',
                asDefault: true
            })
        )
    ]
})
class GrpcServerApp { }

describe('gRPC unary RPC', () => {
    let serverCtx: ApplicationContext;
    let clientCtx: ApplicationContext;
    let port: number;

    before(async () => {
        serverCtx = await Application.run(GrpcServerApp);
        const ref = serverCtx.runners.getRef(GrpcServer as any) as { instance: GrpcServer };
        port = ref.instance.boundPort ?? 0;
        expect(port).toBeGreaterThan(0);

        @Module({
            imports: [LoggerModule],
            providers: [
                provideClient(
                    withGrpcTransport({
                        url: `127.0.0.1:${port}`,
                        protoPath: PROTO_PATH,
                        packageName: 'grpc.test',
                        serviceName: 'Greeter',
                        microservice: true,
                        asDefault: true
                    })
                )
            ]
        })
        class GrpcClientApp { }

        clientCtx = await Application.run(GrpcClientApp);
    });

    after(async () => {
        await clientCtx?.close();
        await serverCtx?.close();
    });

    it('forwards a unary call to the decorated handler', async () => {
        const client = clientCtx.get(GrpcClient);
        const result = await lastValueFrom(client.send(
            { service: 'Greeter', method: 'SayHello' } as any,
            { body: { name: 'World' } } as any
        ));
        expect(result).toEqual({ message: 'hello World' });
    });
});
