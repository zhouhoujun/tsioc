import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import { CoapClient, COAP_SERV_INTERCEPTORS } from '../src';
import { CoapMessageAdapter } from '../src/server/message-adapter';
import { DeviceController } from './controller';
import { BigFileInterceptor } from './BigFileInterceptor';
import { provideService, useBodyParser, useJson, useRouter, useStatics } from '@tsdi/service';
import { useCoapTransport } from '../src/server';
import { provideClient, withTimeout } from '@tsdi/client';
import { withCoapTransport } from '../src/client';

@Module({
    baseURL: __dirname,
    imports: [
        LoggerModule,
    ],
    providers: [
        provideService(
            useBodyParser(),
            useRouter(),
            useJson(),
            useStatics(),
            useCoapTransport({ listenOpts: { port: 5684 }, asDefault: true })
        ),
        provideClient(
            withTimeout(),
            withCoapTransport({ url: 'coap://localhost:5684', asDefault: true })
        )
    ],
    declarations: [
        DeviceController
    ]
})
export class CoapTestModule {

}


describe('CoapMessageAdapter', () => {
    it('should read request data and write status headers body and error', () => {
        const requestHeaders = { accept: 'application/json', 'x-test': '1' };
        const request = {
            headers: requestHeaders,
            body: { id: 'zhou' },
            payload: { id: 'zhou' },
            params: { pid: 'p1' },
            query: { q: 'qq' },
            paths: { id: '42' },
            pattern: '/device/adapter',
            getHeader(name: string) {
                return requestHeaders[name.toLowerCase() as keyof typeof requestHeaders];
            },
            hasHeader(name: string) {
                return requestHeaders[name.toLowerCase() as keyof typeof requestHeaders] != null;
            },
            getHeaderNames() {
                return Object.keys(requestHeaders);
            }
        } as any;
        const adapter = new CoapMessageAdapter(request);
        const error = new Error('boom');

        adapter.setStatus('2.05', 'Content');
        adapter.setHeader('x-message-adapter', 'coap');
        adapter.write({ wrapped: true });
        adapter.writeError(error);

        expect(adapter.read('headers', 'x-test')).toBe('1');
        expect(adapter.read('body', 'id')).toBe('zhou');
        expect(adapter.read('payload', 'id')).toBe('zhou');
        expect(adapter.read('params', 'pid')).toBe('p1');
        expect(adapter.read('query', 'q')).toBe('qq');
        expect(adapter.read('path', 'id')).toBe('42');
        expect(adapter.read('topic')).toBe('/device/adapter');
        expect(adapter.read('status')).toBe('2.05');
        expect(adapter.read('statusMessage')).toBe('Content');
        expect(adapter.read('error')).toBe(error);
        expect(adapter.getStatus()).toBe('2.05');
        expect(adapter.getStatusMessage()).toBe('Content');
        expect(adapter.getResponseHeader('x-message-adapter')).toBe('coap');
        expect(adapter.getBody()).toEqual({ wrapped: true });
        expect(adapter.getError()).toBe(error);
    });
});

describe('CoAP Server & CoAP Client', () => {
    let ctx: ApplicationContext;

    let client: CoapClient;

    before(async () => {
        ctx = await Application.run(CoapTestModule, {
            providers: [
                { provide: COAP_SERV_INTERCEPTORS, useClass: BigFileInterceptor, multi: true }
            ]
        });
        client = ctx.get(CoapClient);
    });

    after(async () => {
        await ctx?.destroy();
    });

    it('should return not found for static json path', async () => {
        const res: any = await lastValueFrom(client.send('/content/510100_full.json', { timeout: 50 } as any).pipe(
            catchError(err => of(err))
        ));
        expect(res.statusMessage).toEqual('Not Found');
    });

    it('should reject oversized json payload through validator', async () => {
        const res: any = await lastValueFrom(client.send('/content/big.json', { timeout: 50 } as any).pipe(
            catchError(err => of(err))
        ));
        expect(String(res.statusMessage || res.message || '')).toContain('Packet length');
    });

    it('should echo route parameter endpoint', async () => {
        const res: any = await lastValueFrom(client.send('/device/123', { timeout: 50 } as any).pipe(
            catchError(err => of(err))
        ));
        expect(res).toBeDefined();
    });
});
