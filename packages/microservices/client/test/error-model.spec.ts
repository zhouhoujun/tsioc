import expect = require('expect');
import { createInjector, Injectable } from '@tsdi/ioc';
import { ErrorResponse } from '@tsdi/common';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';
import { AbstractClient } from '../src/AbstractClient';
import { ClientHandler } from '../src/ClientHandler';
import { ServiceError } from '../src/errors';

class ThrowingHandler {
    injector = createInjector([]);
    constructor(private readonly failure: unknown) { }

    handle(): Observable<any> {
        return throwError(() => this.failure);
    }
}

@Injectable()
class ErrorModelClient extends AbstractClient<any, any> {
    private _handler: ThrowingHandler;

    constructor(failure: unknown) {
        super();
        this._handler = new ThrowingHandler(failure);
    }

    protected get handler(): ClientHandler<any, any> {
        return this._handler as any;
    }

    protected buildRequest(first: any, options: any): any {
        return { payload: first, ...options };
    }

    protected initContext(): void { }
    protected onShutdown(): Promise<void> { return Promise.resolve(); }
}

describe('client error model', () => {
    it('turns a broker ErrorResponse into an Error/ServiceError with preserved fields', async () => {
        const response = new ErrorResponse({
            status: 503,
            statusMessage: 'Service Unavailable',
            headers: { 'x-request-id': 'abc' },
            error: new Error('downstream exploded')
        });
        const client = new ErrorModelClient(response);

        let thrown: any;
        try {
            await lastValueFrom(client.send('topic'));
        } catch (err) {
            thrown = err;
        }

        expect(thrown).toBeInstanceOf(ServiceError);
        expect(thrown).toBeInstanceOf(Error);
        expect(thrown.code).toBe('upstream');
        expect(thrown.status).toBe(503);
        expect(thrown.statusMessage).toBe('Service Unavailable');
        expect(thrown.body).toBe(response.error);
        expect(thrown.headers).toEqual({ 'x-request-id': 'abc' });
        expect(thrown.response).toBe(response);
        expect(thrown.cause).toBe(response.error);
        expect(typeof thrown.stack).toBe('string');
    });

    it('uses the unknown code when a non-Error failure has no status', async () => {
        const client = new ErrorModelClient({ error: 'plain failure' });
        let thrown: any;
        try {
            await lastValueFrom(client.send('topic'));
        } catch (err) {
            thrown = err;
        }
        expect(thrown).toBeInstanceOf(ServiceError);
        expect(thrown.code).toBe('unknown');
        expect(thrown.status).toBeUndefined();
        expect(thrown.message).toBe('plain failure');
    });

    it('passes Error and ServiceError instances through unchanged', async () => {
        const plain = new Error('boom');
        const plainClient = new ErrorModelClient(plain);
        await expect(lastValueFrom(plainClient.send('topic'))).rejects.toBe(plain);

        const serviceError = new ServiceError('nope', 'timeout');
        const serviceClient = new ErrorModelClient(serviceError);
        await expect(lastValueFrom(serviceClient.send('topic'))).rejects.toBe(serviceError);
    });

    it('keeps successful responses untouched', async () => {
        const handler = {
            injector: createInjector([]),
            handle: () => of({ ok: true })
        };
        const client = new ErrorModelClient(new Error('unused'));
        (client as any)._handler = handler;
        const result: any = await lastValueFrom(client.send('topic'));
        expect(result).toEqual({ ok: true });
    });
});
