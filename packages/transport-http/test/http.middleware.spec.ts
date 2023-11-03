import { ServerModule } from '@tsdi/platform-server';
import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { MicroServRouterModule } from '@tsdi/transport';
import { LoggerModule } from '@tsdi/logger';
import { ServerTransportModule } from '@tsdi/platform-server/transport';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { Http, HttpModule, HttpServerModule, HttpServer } from '../src';


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

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run({
            module: ModuleB,
            uses: [
                ServerModule,
                ServerTransportModule,

                MicroServRouterModule.forRoot({ protocol: 'mqtt' }),
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
    })

    it('use in http server.', async () => {

        const runable = await ctx.runners.attach(HttpServer);
        runable.getInstance().use((ctx, next) => {
            console.log('ctx.url:', ctx.url);
            if (ctx.url.startsWith('/test')) {
                console.log('message queue test: ' + ctx.args);
            }

            ctx.body = ctx.query.hi;
            console.log(ctx.body, ctx.query);
            return next();
        }, 0);

        await ctx.runners.run(runable.type);

        const http = ctx.injector.get(Http);

        // has no parent.
        const rep = await lastValueFrom(http.get('test', { observe: 'response', responseType: 'text', params: { hi: 'hello' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(rep.body).toEqual('hello');
        expect(rep.status).toEqual(200);
    });

    after(async () => {
        await ctx.destroy();
    })

});

