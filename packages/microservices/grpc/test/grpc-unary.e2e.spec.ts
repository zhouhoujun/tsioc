import expect = require('expect');
import * as path from 'node:path';
import { Inject, Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { Controller, Handle, Payload, provideService, useRouter } from '@tsdi/service';
import { REQUEST, Transport } from '@tsdi/common';
import { provideClient } from '@tsdi/client';
import { lastValueFrom, Observable, Subject, toArray } from 'rxjs';
import { GrpcServer } from '../src/server/grpc-server';
import { useGrpcTransport } from '../src/server/factory';
import { GrpcClient } from '../src/client/client';
import { withGrpcTransport } from '../src/client/factory';

const PROTO_PATH = path.resolve(__dirname, 'fixtures/greeter.proto');

@Controller('/grpc')
class GreeterController {
    static cancelled = 0;
    static uploads = 0;
    static chatCancelled = 0;

    @Handle('/grpc.test.Greeter/Watch', Transport.gRPC)
    watch(@Payload('name') name: string) {
        return new Observable<any>(subscriber => {
            let index = 0;
            const timer = setInterval(() => {
                index += 1;
                subscriber.next({ message: `${name}-${index}` });
                if (index >= 2) {
                    clearInterval(timer);
                    subscriber.complete();
                }
            }, 5);
            return () => clearInterval(timer);
        });
    }

    @Handle('/grpc.test.Greeter/Upload', Transport.gRPC)
    upload(@Payload() payload: any) {
        GreeterController.uploads += 1;
        const items = Array.isArray(payload) ? payload : [payload];
        return { message: items.map((item: any) => item?.name).join(',') };
    }

    @Handle('/grpc.test.Greeter/Chat', Transport.gRPC)
    chat(@Payload('stream') stream: AsyncIterable<any>) {
        return new Observable<any>(subscriber => {
            let cancelled = false;
            (async () => {
                for await (const item of stream) {
                    if (cancelled) {
                        return;
                    }
                    subscriber.next({ message: item?.name });
                }
                if (!cancelled) {
                    subscriber.complete();
                }
            })().catch(error => subscriber.error(error));
            return () => {
                cancelled = true;
                GreeterController.chatCancelled += 1;
            };
        });
    }

    @Handle('/grpc.test.Greeter/Forever', Transport.gRPC)
    forever() {
        return new Observable<any>(subscriber => {
            const timer = setInterval(() => subscriber.next({ message: 'tick' }), 10);
            return () => {
                clearInterval(timer);
                GreeterController.cancelled += 1;
            };
        });
    }

    @Handle('/grpc.test.Greeter/SayHello', Transport.gRPC)
    sayHello(@Payload('name') name: string, @Inject(REQUEST) request: any) {
        if (name === 'slow') {
            return new Promise(resolve => setTimeout(() => resolve({ message: 'slow' }), 200));
        }
        if (name === 'headers') {
            return { message: request?.headers?.authorization ?? '' };
        }
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

    it('streams multiple server responses', async () => {
        const client = clientCtx.get(GrpcClient);
        const values = await lastValueFrom(
            client.serverStream<any>({ service: 'Greeter', method: 'Watch' } as any, {
                body: { name: 'tick' }
            }).pipe(toArray())
        );
        expect(values.map(value => value.message)).toEqual(['tick-1', 'tick-2']);
    });

    it('collects multiple client-stream messages', async () => {
        const client = clientCtx.get(GrpcClient);
        const result = await lastValueFrom(client.clientStream<any>(
            { service: 'Greeter', method: 'Upload' } as any,
            [{ name: 'a' }, { name: 'b' }, { name: 'c' }]
        ));
        expect(result).toEqual({ message: 'a,b,c' });
    });

    it('echoes messages through bidirectional streaming', async () => {
        const client = clientCtx.get(GrpcClient);
        const values = await lastValueFrom(
            client.bidiStream<any>(
                { service: 'Greeter', method: 'Chat' } as any,
                [{ name: 'x' }, { name: 'y' }]
            ).pipe(toArray())
        );
        expect(values.map(value => value.message)).toEqual(['x', 'y']);
    });

    it('does not invoke the handler when a client stream is cancelled', async () => {
        const client = clientCtx.get(GrpcClient);
        const before = GreeterController.uploads;
        const values = new Subject<any>();
        const subscription = client.clientStream<any>(
            { service: 'Greeter', method: 'Upload' } as any,
            values
        ).subscribe(() => undefined);
        values.next({ name: 'partial' });
        await new Promise(resolve => setTimeout(resolve, 20));
        subscription.unsubscribe();
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(GreeterController.uploads).toBe(before);
    });

    it('propagates client cancellation to the server handler teardown', async () => {
        const client = clientCtx.get(GrpcClient);
        const before = GreeterController.cancelled;
        const subscription = client.serverStream<any>(
            { service: 'Greeter', method: 'Forever' } as any,
            { body: { name: 'cancel' } }
        ).subscribe(() => undefined);
        await new Promise(resolve => setTimeout(resolve, 30));
        subscription.unsubscribe();
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(GreeterController.cancelled).toBeGreaterThan(before);
    });

    it('cancels a bidi stream fed by an Observable input', async () => {
        const client = clientCtx.get(GrpcClient);
        const before = GreeterController.chatCancelled;
        const values = new Subject<any>();
        const received: any[] = [];
        const subscription = client.bidiStream<any>(
            { service: 'Greeter', method: 'Chat' } as any,
            values
        ).subscribe(value => received.push(value));

        await new Promise(resolve => setTimeout(resolve, 20));
        values.next({ name: 'first' });
        await new Promise(resolve => setTimeout(resolve, 20));
        subscription.unsubscribe();
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(received.map(value => value.message)).toContain('first');
        expect(GreeterController.chatCancelled).toBeGreaterThan(before);
    });

    it('propagates metadata to the handler', async () => {
        const client = clientCtx.get(GrpcClient);
        const result = await lastValueFrom(client.send(
            { service: 'Greeter', method: 'SayHello' } as any,
            { body: { name: 'headers' }, headers: { authorization: 'Bearer abc' } } as any
        )) as any;
        expect(result.message).toBe('Bearer abc');
    });

    it('honors the request deadline', async () => {
        const client = clientCtx.get(GrpcClient);
        let error: any;
        try {
            await lastValueFrom(client.send(
                { service: 'Greeter', method: 'SayHello' } as any,
                { body: { name: 'slow' }, timeout: 20 } as any
            ));
        } catch (err) {
            error = err;
        }
        expect(error?.code).toBe(4);
    });
});
