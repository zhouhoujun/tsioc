import { ServerModule } from '@tsdi/platform-server';
import expect = require('expect');
import { catchError, lastValueFrom, Observable, of, throwError } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { Application, LoggerModule, Module } from '@tsdi/core';
import { Http, HttpClientOpts, HttpModule, HttpServer } from '@tsdi/transport-http';

@Module({
    imports: [
        LoggerModule
    ]
})
class ModuleB {

}

const key = fs.readFileSync(path.join(__dirname, '../../../cert/localhost-privkey.pem'));
const cert = fs.readFileSync(path.join(__dirname, '../../../cert/localhost-cert.pem'));

describe('middleware', () => {


    it('use in http server.', async () => {

        const ctx = await Application.run({
            module: ModuleB,
            uses: [
                ServerModule,
                HttpModule.withOption({
                    majorVersion: 2,
                    serverOpts: {
                        allowHTTP1: true,
                        key,
                        cert
                    },
                    listenOpts: {
                        port: 3200
                    }
                })
            ]
        });
        const runable = ctx.createRunnable(HttpServer);
        runable.instance.use((ctx, next) => {
            console.log('ctx.url:', ctx.url);
            if (ctx.url.startsWith('/test')) {
                console.log('message queue test: ' + ctx.payload);
            }

            console.log(ctx.body, ctx.query);
            ctx.body = ctx.query.hi;
            return next();
        }, 0);

        await runable.run();

        const http = ctx.injector.resolve(Http, {
            provide: HttpClientOpts,
            useValue: {
                authority: 'https://localhost:3200',
                options: {
                    ca: cert
                }
            } as HttpClientOpts
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

