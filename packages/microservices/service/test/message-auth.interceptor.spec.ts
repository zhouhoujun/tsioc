import expect = require('expect');
import { RequestContext, RequestHandler, StatusMessageAdapter } from '@tsdi/common';
import { createInjector } from '@tsdi/ioc';
import { lastValueFrom, of } from 'rxjs';
import { MessageAuthInterceptor } from '../src/interceptors/message-auth';
import { SERVICE_AUTH_OPTIONS } from '../src/provider';

class AdapterStub {
    constructor(private request: any) {
    }

    read(section: any): any {
        switch (section) {
            case 'headers':
                return this.request.headers ?? {};
            case 'query':
                return this.request.query ?? {};
            case 'topic':
                return this.request.url ?? this.request.topic;
            default:
                return undefined;
        }
    }
}

class ContextStub {
    private values = new Map<any, any>();

    constructor(request: any, authOptions: any) {
        const adapter = new AdapterStub(request);
        const injector = createInjector([
            { provide: StatusMessageAdapter, useValue: adapter },
            { provide: SERVICE_AUTH_OPTIONS, useValue: authOptions },
        ]);
        this.values.set(StatusMessageAdapter, adapter);
        this.values.set('injector', injector);
    }

    get(token: any, defaultValue?: any): any {
        if (this.values.has(token)) {
            return this.values.get(token);
        }
        return this.values.get('injector').get(token, defaultValue);
    }
}

describe('MessageAuthInterceptor', () => {
    it('authenticates bearer tokens from message headers', async () => {
        const request = {
            url: '/secure/ping',
            headers: {
                authorization: 'Bearer secret-token'
            }
        };
        const interceptor = new MessageAuthInterceptor({ bearerToken: 'secret-token' });
        const next: RequestHandler<any, any, RequestContext> = { handle: (input: any) => of(input) } as any;
        const result = await lastValueFrom(interceptor.intercept(request, next, new ContextStub(request, { bearerToken: 'secret-token' }) as any));
        expect(result._auth.authenticated).toBe(true);
        expect(result._auth.token).toBe('secret-token');
    });

    it('rejects requests without a valid bearer token', async () => {
        const request = { url: '/secure/ping', headers: {} };
        const interceptor = new MessageAuthInterceptor({ bearerToken: 'secret-token' });
        const next: RequestHandler<any, any, RequestContext> = { handle: () => of({ ok: true }) } as any;
        await expect(lastValueFrom(interceptor.intercept(request, next, new ContextStub(request, { bearerToken: 'secret-token' }) as any))).rejects.toThrow('Unauthorized');
    });
});
