import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { catchError, firstValueFrom, of } from 'rxjs';
import expect = require('expect');
import { provideClient } from '@tsdi/client';
import { ErrorResponse, Transport } from '@tsdi/common';
import { provideService, withServiceRouter, Handle, Payload, RequestPath, Subscribe } from '@tsdi/service';
import { withWsClientTransport, WsClient } from '../src/client';
import { withWsTransport } from '../src/server';

describe('WebSocket Microservice End-to-End Message Test', () => {

    class WsMessageService {
        @Handle({ cmd: 'ping' }, Transport.WS)
        ping(@Payload() payload: { value: string }) {
            return payload.value;
        }

        @Subscribe('sensor/:id/start', Transport.WS)
        start(@RequestPath('id') id: string, @Payload() payload: { value: string }) {
            return { id, value: payload.value };
        }
    }

    @Module({
        imports: [LoggerModule],
        declarations: [WsMessageService],
        providers: [
            ...provideService(
                withServiceRouter(),
                withWsTransport({
                    microservice: true,
                    listenOpts: { port: 11500, host: '127.0.0.1' },
                    asDefault: true
                })
            ),
            ...provideClient(
                withWsClientTransport({
                    microservice: true,
                    url: 'ws://127.0.0.1:11500',
                    asDefault: true
                })
            )
        ]
    })
    class WsMicroserviceModule { }

    let ctx: ApplicationContext;
    let client: WsClient;

    before(async () => {
        ctx = await Application.run(WsMicroserviceModule);
        client = ctx.get(WsClient);
        await new Promise(resolve => setTimeout(resolve, 300));
    });

    after(async () => {
        if (ctx) {
            await ctx.close();
        }
    });

    it('should use simpleJson by default for command messages', async () => {
        const result = await firstValueFrom(
            client.send({ cmd: 'ping' }, {
                payload: { value: 'pong' }
            }).pipe(
                catchError(err => of(err))
            )
        );

        expect(result).toBe('pong');
    });

    it('should use simpleJson by default for subscribe routes', async () => {
        const result = await firstValueFrom(
            client.send('sensor/device-01/start', {
                payload: { value: 'started' }
            }).pipe(
                catchError(err => of(err))
            )
        );

        expect(result).toEqual({ id: 'device-01', value: 'started' });
    });

    it('should return not found for unmatched message patterns', async () => {
        const result = await firstValueFrom(
            client.send('sensor/device-01/stop', {
                payload: { value: 'stopped' }
            }).pipe(
                catchError(err => of(err as ErrorResponse))
            )
        );

        expect(result).toBeInstanceOf(ErrorResponse);
        expect((result as ErrorResponse).statusText).toBe('Not Found');
    });
});
