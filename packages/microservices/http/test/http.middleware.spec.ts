import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { lastValueFrom, catchError, of } from 'rxjs';
import expect = require('expect');
import { provideClient } from '@tsdi/client';
import { Controller, Get, provideService, withServiceMiddlewares, withServiceRouter } from '@tsdi/service';
import { HttpClient, withHttpClientTransport } from '../src/client';
import { HttpRequestMessage, withHttpTransport } from '../src/server';

const PORT = 3200 + Math.floor(Math.random() * 1000);

@Controller('/api/middleware')
class MiddlewareController {
    @Get('/info')
    info() {
        return { status: 'ok' };
    }
}

describe('middleware', () => {
    @Module({
        imports: [LoggerModule],
        declarations: [MiddlewareController],
        providers: [
            provideService(
                withServiceRouter(),
                withServiceMiddlewares(async (ctx, next) => {
                    const request = ctx.getRequest() as HttpRequestMessage;
                    if (request.url?.startsWith('/test')) {
                        ctx.getResponse().body = request.query.hi;
                        return;
                    }
                    await next();
                }),
                withHttpTransport({
                    listenOpts: {
                        port: PORT,
                        host: '127.0.0.1'
                    },
                    asDefault: true
                })
            ),
            provideClient(
                withHttpClientTransport({
                    url: `http://127.0.0.1:${PORT}`,
                    asDefault: true
                })
            )
        ]
    })
    class MiddlewareModule { }

    let ctx: ApplicationContext;
    let client: HttpClient;

    before(async () => {
        ctx = await Application.run(MiddlewareModule);
        client = ctx.get(HttpClient);
    });

    after(async () => {
        await ctx?.destroy();
    });

    it('uses middleware in http server', async () => {
        const response = await lastValueFrom(
            client.get('/test', { observe: 'response', responseType: 'text', params: { hi: 'hello' } })
                .pipe(catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err);
                }))
        );

        expect(response.body).toBe('hello');
        expect(response.status).toBe(200);
    });

    it('falls through to controller route', async () => {
        const response = await lastValueFrom(
            client.get('/api/middleware/info', { observe: 'response', params: { hi: 'hello' } })
                .pipe(catchError(err => {
                    ctx.getLogger().error(err);
                    return of(err);
                }))
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
});
