import { Application, ApplicationContext, Handle, Payload, Subscribe } from '@tsdi/core';
import { Injectable, Injector, Module, isArray, tokenId } from '@tsdi/ioc';
import { TCP_CLIENT_OPTS, TcpClient, TcpClientOpts, TcpModule, TcpServer } from '../src';
import { ServerModule } from '@tsdi/platform-server';
import { LoggerModule } from '@tsdi/logs';
import { catchError, lastValueFrom, of } from 'rxjs';
import expect = require('expect');
import path = require('path');
import del = require('del');


const SENSORS = tokenId<string[]>('SENSORS');


@Injectable()
export class TcpMicroService  {

    constructor(private client: TcpClient){

    }


    @Handle({ cmd: 'xxx', protocol: 'tcp' })
    async handleMessage() {

    }

    @Handle('dd/**', 'tcp')
    async handleMessage1() {

    }

    @Subscribe('sensor/:id/dd/**', 'tcp', {
        paths: {
            id: SENSORS
        }
    })
    async subsMessage(@Payload() id: string) {
        //todo sth
        this.client.send('');
    }
}


@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        TcpModule.forMicroService({
            serverOpts: {
                timeout: 1000,
                listenOpts: {
                    port: 2000
                }
            }
        })
    ],
    declarations: [
        TcpMicroService
    ],
    bootstrap: TcpServer
})
export class MicroTcpTestModule {

}



describe('TCP Server & TCP Client', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: TcpClient;

    before(async () => {
        ctx = await Application.run(MicroTcpTestModule);
        injector = ctx.injector;
        client = injector.resolve(TcpClient, {
            provide: TCP_CLIENT_OPTS,
            useValue: {
                connectOpts: {
                    port: 2000
                }
            } as TcpClientOpts
        });
    });


    it('fetch json', async () => {
        const res: any = await lastValueFrom(client.send('510100_full.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res).toBeDefined();
        expect(isArray(res.features)).toBeTruthy();
    })

    it('query all', async () => {
        const a = await lastValueFrom(client.send<any[]>('/device')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isArray(a)).toBeTruthy();
        expect(a.length).toEqual(2);
        expect(a[0].name).toEqual('1');
    });

    it('query with params ', async () => {
        const a = await lastValueFrom(client.send<any[]>('/device', { params: { name: '2' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(isArray(a)).toBeTruthy();
        expect(a.length).toEqual(1);
        expect(a[0].name).toEqual('2');
    });

    it('not found', async () => {
        const a = await lastValueFrom(client.send('/device/init5', { method: 'POST', params: { name: 'test' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        expect(a.status).toEqual(404);
    });

    it('bad request', async () => {
        const a = await lastValueFrom(client.send('/device/-1/used', { observe: 'response', params: { age: '20' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        expect(a.status).toEqual(400);
    })

    it('post route response object', async () => {
        const a = await lastValueFrom(client.send<any>('/device/init', { observe: 'response', method: 'POST', params: { name: 'test' } }));
        expect(a.status).toEqual(200);
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const b = await lastValueFrom(client.send('/device/update', { observe: 'response', responseType: 'text', method: 'POST', params: { version: '1.0.0' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(b.status).toEqual(200);
        expect(b.ok).toBeTruthy();
        expect(b.body).toEqual('1.0.0');
    });

});
