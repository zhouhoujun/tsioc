import { ServerHttpClientModule, ServerLogsModule, ServerModule } from '@tsdi/platform-server';
import expect = require('expect');
import { catchError, lastValueFrom, Observable, of, throwError } from 'rxjs';
import * as net from 'node:net';
import { Application, HttpClient, HttpClientModule, LoggerModule, Module } from '@tsdi/core';
import { HttpModule, HttpServer } from '../src';

@Module({
    imports:[
        LoggerModule
    ]
})
class ModuleB {

}

describe('middleware', () => {


    it('use in http server.', async () => {

        const ctx = await Application.run({
            module: ModuleB,
            uses: [
                ServerModule,
                HttpClientModule,
                ServerHttpClientModule,
                HttpModule.withOption({
                    majorVersion: 1,
                })
            ]
        });
        const runable = ctx.createRunnable(HttpServer);
        runable.instance.use((ctx, next) => {
            console.log('ctx.url:', ctx.url);
            if (ctx.url.startsWith('/test')) {
                console.log('message queue test: ' + ctx.playload);
            }

            console.log(ctx.body, ctx.query);
            ctx.body = ctx.query.hi;
            return next();
        }, 0);

        await runable.run();

        // has no parent.
        const rep = await lastValueFrom(ctx.resolve(HttpClient).request('GET', 'test', { observe: 'response', responseType: 'text', params: { hi: 'hello' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(rep.body).toEqual('hello');
        expect(rep.status).toEqual(200);

        await ctx.destroy();
    });


});

