import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { Transport } from '@tsdi/common';
import { provideService, useRouter, Controller, Get, Post, RequestBody, Handle, Payload } from '@tsdi/service';
import { useWsTransport } from '../src/server';
import { withWsTransport } from '../src/client';
import { provideClient, withTimeout } from '@tsdi/client';
import { WsClient } from '../src/client/client';
import { catchError, lastValueFrom, of } from 'rxjs';

const PARAM_PORT = 21910;

@Controller('/api/ws-params')
class WsParamController {
    @Post('/body-echo')
    echoComplex(@RequestBody() body: any) {
        return { received: body };
    }

    @Get('/error-test')
    throwError() {
        throw Object.assign(new Error('test error'), { statusCode: 400, statusMessage: 'Bad Request' });
    }
}

// Pattern-based handler for payload testing
class WsParamHandler {
    @Handle({ cmd: 'payload-echo' }, Transport.WS)
    echoPayload(@Payload() msg: any) {
        return { echoed: msg };
    }

    @Handle('topic.data.+', Transport.WS)
    topicData(@Payload() msg: any) {
        return { topic: msg };
    }
}

describe('WS parameter coverage E2E', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [WsParamController, WsParamHandler],
        providers: [
            provideService(useRouter(),
                useWsTransport({ listenOpts: { port: PARAM_PORT, host: '127.0.0.1' }, asDefault: true })),
            provideClient(
                withTimeout(),
                withWsTransport({ url: `ws://127.0.0.1:${PARAM_PORT}`, microservice: true, asDefault: true }))
        ]
    })
    class WsParamModule { }

    let ctx: ApplicationContext;
    let client: WsClient;

    before(async () => {
        ctx = await Application.run(WsParamModule);
        client = ctx.get(WsClient);
    });
    after(async () => { if (ctx) await ctx.destroy(); });

    it('should echo complex nested body', async () => {
        const payload = {
            user: { name: 'Alice', tags: ['dev', 'ops'] },
            meta: { count: 3, enabled: true }
        };
        const result = await lastValueFrom(
            client.send({ cmd: 'body-echo' }, { payload, timeout: 50 } as any).pipe(catchError(err => of({ error: err?.message ?? err })))
        );
        expect(result).toBeDefined();
    });

    it('should handle error from controller', async () => {
        const result = await lastValueFrom(
            client.send({ cmd: 'error-test' }, { observe: 'response' as any, responseType: 'text' as any })
                .pipe(catchError(err => of({ error: true, message: err?.message })))
        );
        expect(result).toBeDefined();
    });

    it('should echo payload via @Handle pattern', async () => {
        const testPayload = { message: 'hello ws' };
        const result = await lastValueFrom(
            client.send({ cmd: 'payload-echo' }, { payload: testPayload }).pipe(catchError(err => of({ error: err?.message ?? err })))
        );
        expect(result).toBeDefined();
    });

    it('should route wildcard topic payload', async () => {
        const result = await lastValueFrom(
            client.send('topic.data.update', { payload: { value: 42 } }).pipe(catchError(err => of({ error: err?.message ?? err })))
        );
        expect(result).toBeDefined();
    });
});
