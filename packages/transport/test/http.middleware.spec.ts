import { ServerModule } from '@tsdi/platform-server';
import expect = require('expect');
import { catchError, lastValueFrom, Observable, of, throwError } from 'rxjs';
import * as net from 'node:net';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Application, LoggerModule, Module } from '@tsdi/core';
import { Http, HttpClientOptions, HttpModule, HttpServer } from '../src';

@Module({
    imports: [
        LoggerModule
    ]
})
class ModuleB {

}

const key = fs.readFileSync(path.join(__dirname, './localhost-privkey.pem'));
const cert = fs.readFileSync(path.join(__dirname, './localhost-cert.pem'));

describe('middleware', () => {


    it('use in http server.', async () => {

        const ctx = await Application.run({
            module: ModuleB,
            uses: [
                ServerModule,
                HttpModule.withOption({
                    majorVersion: 2,
                    options: {
                        allowHTTP1: true,
                        key,
                        cert
                    }
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

        const http = ctx.injector.resolve(Http, {
            provide: HttpClientOptions,
            useValue: {
                key,
                cert
            }
        });

        // has no parent.
        const rep = await lastValueFrom(http.get('test', { observe: 'response', responseType: 'text', params: { hi: 'hello' } })
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

