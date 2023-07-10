import { Application, ApplicationContext, MicroServRouterModule } from '@tsdi/core';
import { Injector, Module, isArray } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logs';
import { ServerModule } from '@tsdi/platform-server';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import { CoapClient, CoapServer, CoapClientOpts, COAP_CLIENT_OPTS, CoapClientModule, CoapServerModule } from '../src';
import { DeviceController } from './controller';
import { Bodyparser, Content, Json } from '@tsdi/transport';



@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        // CoapClientModule,
        CoapClientModule,
        MicroServRouterModule.forRoot('coap'),
        CoapServerModule.withOption({
            serverOpts: {
                interceptors: [
                    Content,
                    Json,
                    Bodyparser,
                    { useExisting: MicroServRouterModule.getToken('coap') }
                ]
            }
        })
    ],
    declarations: [
        DeviceController
    ],
    bootstrap: CoapServer
})
export class CoapTestModule {

}


describe('CoAP Server & CoAP Client', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: CoapClient;

    before(async () => {
        ctx = await Application.run(CoapTestModule);
        injector = ctx.injector;
        client = injector.resolve(CoapClient);
    });


    // it('fetch json', async () => {
    //     const res: any = await lastValueFrom(client.send('510100_full.json', { method: 'GET' })
    //         .pipe(
    //             catchError((err, ct) => {
    //                 ctx.getLogger().error(err);
    //                 return of(err);
    //             })));

    //     expect(res).toBeDefined();
    //     expect(isArray(res.features)).toBeTruthy();
    // })
    

    it('fetch json 2', async () => {
        const res: any = await lastValueFrom(client.send('jsons/data1.json')
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res).toBeDefined();
        expect(res.test).toEqual('ok');
    })


    it('not found', async () => {
        const a = await lastValueFrom(client.send('/device/init5', { method: 'GET', params: { name: 'test' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        expect(a.status).toEqual('4.04');
    });


    it('bad request', async () => {
        const a = await lastValueFrom(client.send('/device/-1/used', { observe: 'response', params: { age: '20' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        expect(a.status).toEqual('4.00');
    })

    it('post route response object', async () => {
        const a = await lastValueFrom(client.send<any>('/device/init', { observe: 'response', method: 'POST', params: { name: 'test' } }));
        expect(a.status).toEqual('2.05');
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const b = await lastValueFrom(client.send('/device/update', { observe: 'response', responseType: 'text', method: 'POST', params: { version: '1.0.0' } }))
            // .pipe(
            //     catchError((err, ct) => {
            //         ctx.getLogger().error(err);
            //         return of(err);
            //     })));
        expect(b.status).toEqual('2.05');
        expect(b.ok).toBeTruthy();
        expect(b.body).toEqual('1.0.0');
    });

    it('route with request body pipe', async () => {
        const a = await lastValueFrom(client.send<any>('/device/usage', { observe: 'response', method: 'POST', body: { id: 'test1', age: '50', createAt: '2021-10-01' } }));
        // a.error && console.log(a.error);
        expect(a.status).toEqual('2.05');
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.year).toStrictEqual(50);
        expect(new Date(a.body.createAt)).toEqual(new Date('2021-10-01'));
    })

    it('route with request body pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usage', { observe: 'response', method: 'POST' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.00');
        // expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request body pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usage', { observe: 'response', method: 'POST', body: { id: 'test1', age: 'test', createAt: '2021-10-01' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.00');
        // expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(client.send('/device/usege/find', { observe: 'response', params: { age: '20' } }));
        expect(a.status).toEqual('2.05');
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(20);
    })

    it('route with request param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usege/find', { observe: 'response' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.00');
        // expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request param pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usege/find', { observe: 'response', params: { age: 'test' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.00');
        // expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(client.send('/device/30/used', { observe: 'response', params: { age: '20' } }));
        expect(a.status).toEqual('2.05');
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(30);
    })

    it('route with request restful param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device//used', { observe: 'response', params: { age: '20' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.04');
        // expect(r.error).toBeInstanceOf(MissingParameterError);
    })

    it('route with request restful param pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/age1/used', { observe: 'response', params: { age: '20' } })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.00');
        // expect(r.error).toBeInstanceOf(ArgumentError);
    })


    it('response with Observable', async () => {
        const r = await lastValueFrom(client.send('/device/status', { observe: 'response', responseType: 'text' })
            .pipe(
                catchError((err, ct) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('2.05');
        expect(r.body).toEqual('working');
    })

    // it('redirect', async () => {
    //     const result = 'reload';
    //     const r = await lastValueFrom(client.send('/device/status', { observe: 'response', params: { redirect: 'reload' }, responseType: 'text' }));
    //     expect(r.status).toEqual('2.05');
    //     expect(r.body).toEqual(result);
    // })

    it('xxx micro message', async () => {
        const result = 'reload2';
        const r = await lastValueFrom(client.send({ cmd: 'xxx' }, { observe: 'response', payload: { message: result }, responseType: 'text' }).pipe(
            catchError((err, ct) => {
                ctx.getLogger().error(err);
                return of(err);
            })));
        expect(r.status).toEqual('2.05');
        expect(r.body).toEqual(result);
    })

    it('dd micro message', async () => {
        const result = 'reload';
        const r = await lastValueFrom(client.send('/dd/status', { observe: 'response', payload: { message: result }, responseType: 'text' }).pipe(
            catchError((err, ct) => {
                ctx.getLogger().error(err);
                return of(err);
            })));
        expect(r.status).toEqual('2.05');
        expect(r.body).toEqual(result);
    })

    after(() => {
        return ctx.destroy();
    })
});
