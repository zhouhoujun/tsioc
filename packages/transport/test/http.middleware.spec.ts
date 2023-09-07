import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { Application } from '@tsdi/core';
import { ServerModule } from '@tsdi/platform-server';
import { Http, HttpServerModule, HttpServer, HttpModule } from '@tsdi/transport-http';

import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

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
                    clientOpts: {
                        authority: 'https://localhost:3200',
                        options: {
                            ca: cert
                        }
                    }
                }),
                HttpServerModule.withOption({
                    serverOpts: {
                        majorVersion: 2,
                        serverOpts: {
                            allowHTTP1: true,
                            key,
                            cert
                        },
                        listenOpts: {
                            port: 3200
                        }
                    }
                })
            ]
        });
        const runable = await ctx.runners.attach(HttpServer);
        runable.getInstance().use((ctx, next) => {
            console.log('ctx.url:', ctx.url);
            if (ctx.url.startsWith('/test')) {
                console.log('message queue test: ' + ctx.arguments);
            }

            console.log(ctx.body, ctx.query);
            ctx.body = ctx.query.hi;
            return next();
        }, 0);

        await ctx.runners.run(runable.type);

        const http = ctx.injector.resolve(Http);

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

