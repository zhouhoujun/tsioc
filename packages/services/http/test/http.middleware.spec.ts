import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { Application, ApplicationContext } from '@tsdi/core';
import { ClientModule } from '@tsdi/common/client';
import { EndpointsModule, MicroServRouterModule } from '@tsdi/endpoints';
import { ServerModule } from '@tsdi/platform-server';
import { ServerTransportModule } from '@tsdi/platform-server/transport';
import { WsModule } from '@tsdi/ws';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { Http, HttpModule, HttpServer } from '../src';


@Module({
    imports: [
        LoggerModule
    ]
})
class ModuleB {

}

const key = fs.readFileSync(path.join(__dirname, '../../../../cert/localhost-privkey.pem'));
const cert = fs.readFileSync(path.join(__dirname, '../../../../cert/localhost-cert.pem'));

describe('middleware', () => {

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run({
            module: ModuleB,
            uses: [
                ServerModule,
                ServerTransportModule,
                HttpModule,
                WsModule,
                MicroServRouterModule.forRoot({ protocol: 'ws' }),
                ClientModule.register({
                    transport: 'http',
                    clientOpts: {
                        authority: 'https://localhost:3200',
                        options: {
                            ca: cert
                        }
                    }
                }),
                EndpointsModule.register({
                    transport: 'http',
                    bootstrap: false,
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

        const runable = ctx.runners.getRef(HttpServer);

        runable.getInstance().use((ctx, next) => {
            console.log('ctx.url:', ctx.url);
            if (ctx.url.startsWith('/test')) {
                console.log('message queue test: ' + ctx.args);
            }

            ctx.body = ctx.args.hi;
            console.log(ctx.body, ctx.args);
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

