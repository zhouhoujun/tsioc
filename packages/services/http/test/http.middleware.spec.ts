import { Module } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { Application, ApplicationContext } from '@tsdi/core';
import { ClientModule } from '@tsdi/common/client';
import { EndpointsModule, SetupServices } from '@tsdi/endpoints';
import { AssetTransportModule } from '@tsdi/endpoints/assets';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { WsModule, WsServer } from '@tsdi/ws';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { HTTP_MIDDLEWARES, Http, HttpModule, HttpServer } from '../src';



const key = fs.readFileSync(path.join(__dirname, '../../../../cert/localhost-privkey.pem'));
const cert = fs.readFileSync(path.join(__dirname, '../../../../cert/localhost-cert.pem'));

@Module({
    imports: [
        ServerModule,
        LoggerModule,
        ServerEndpointModule,
        AssetTransportModule,
        HttpModule,
        WsModule,
        ClientModule.register({
            transport: 'http',
            clientOpts: {
                authority: 'https://localhost:3200',
                options: {
                    ca: cert
                }
            }
        }),
        EndpointsModule.register([
            {
                microservice: true,
                bootstrap: false,
                transport: 'ws',
                serverOpts: {
                    heybird: true
                }
            },
            {
                transport: 'http',
                bootstrap: false,
                serverOpts: {
                    middlewares: [

                    ],
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
            }
        ])
    ]
})
class ModuleB {

}

describe('middleware', () => {

    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run(ModuleB);
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

        //run services
        // await ctx.runners.run([WsServer, HttpServer]);
        //or
        await ctx.get(SetupServices).run();

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

