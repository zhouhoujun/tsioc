import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import { CoapClient, COAP_SERV_INTERCEPTORS } from '../src';
import { DeviceController } from './controller';
import { BigFileInterceptor } from './BigFileInterceptor';
import { provideService, useBodyParser, useContent, useJson, useRouter } from '@tsdi/service';
import { useCoapTransport } from '../src/server';
import { provideClient } from '@tsdi/client';
import { withCoapTransport } from '../src/client';



@Module({
    baseURL: __dirname,
    imports: [
        LoggerModule,
    ],
    providers: [
        provideService(
            useRouter(),
            useRouter({ microservice: true }),
            useContent(),
            useJson(),
            useBodyParser(),
            useCoapTransport({ microservice: false as any, asDefault: true })
        ),
        provideClient(
            withCoapTransport({ microservice: false, asDefault: true })
        )
    ],
    declarations: [
        DeviceController
    ]
})
export class CoapTestModule {

}


describe('CoAP Server & CoAP Client', () => {
    let ctx: ApplicationContext;

    let client: CoapClient;

    before(async () => {
        ctx = await Application.run(CoapTestModule, {
            providers: [
                { provide: COAP_SERV_INTERCEPTORS, useClass: BigFileInterceptor, multi: true },
            ]
        });
        client = ctx.get(CoapClient);
    });


    // it('fetch json', async () => {
    //     const res: any = await lastValueFrom(client.send('510100_full.json', { method: 'GET', headers: { observe: 'true' } })
    //         .pipe(
    //             catchError((err) => {
    //                 ctx.getLogger().error(err);
    //                 return of(err);
    //             })));

    //     expect(res).toBeDefined();
    //     expect(isArray(res.features)).toBeTruthy();
    // })

    // it('fetch big json', async () => {
    //     const res: any = await lastValueFrom(client.send('/content/big.json')
    //         .pipe(
    //             catchError((err) => {
    //                 ctx.getLogger().error(err);
    //                 return of(err);
    //             })));

    //     expect(res).toBeDefined();
    //     expect(isArray(res.features)).toBeTruthy();
    // })

    it('fetch json 2', async () => {
        const res: any = await lastValueFrom(client.send('jsons/data1.json')
            .pipe(
                catchError((err) => {
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
        const a = await lastValueFrom(client.send('/device/-1/used', { observe: 'response' as any, params: { age: '20' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        expect(a.status).toEqual('4.00');
    })

    it('post route response object', async () => {
        const a = await lastValueFrom(client.send<any>('/device/init', { observe: 'response' as any, method: 'POST', params: { name: 'test' } }));
        expect(a.status).toEqual('2.05');
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const b = await lastValueFrom(client.send('/device/update', { observe: 'response' as any, responseType: 'text' as any, method: 'POST', params: { version: '1.0.0' } }))
        // .pipe(
        //     catchError((err) => {
        //         ctx.getLogger().error(err);
        //         return of(err);
        //     })));
        expect(b.status).toEqual('2.05');
        expect(b.ok).toBeTruthy();
        expect(b.body).toEqual('1.0.0');
    });

    it('route with request body pipe', async () => {
        const a = await lastValueFrom(client.send<any>('/device/usage', { observe: 'response' as any, method: 'POST', body: { id: 'test1', age: '50', createAt: '2021-10-01' } }));
        // a.error && console.log(a.error);
        expect(a.status).toEqual('2.05');
        expect(a.ok).toBeTruthy();
        expect(a.body).toBeDefined();
        expect(a.body.year).toStrictEqual(50);
        expect(new Date(a.body.createAt)).toEqual(new Date('2021-10-01'));
    })

    it('route with request body pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usage', { observe: 'response' as any, method: 'POST' })
            .pipe(
                catchError((err) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.00');
        // expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request body pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usage', { observe: 'response' as any, method: 'POST', body: { id: 'test1', age: 'test', createAt: '2021-10-01' } })
            .pipe(
                catchError((err) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.00');
        // expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(client.send('/device/usege/find', { observe: 'response' as any, params: { age: '20' } }));
        expect(a.status).toEqual('2.05');
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(20);
    })

    it('route with request param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usege/find', { observe: 'response' as any })
            .pipe(
                catchError((err) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.00');
        // expect(r.error).toBeInstanceOf(MissingParameterError)
    })

    it('route with request param pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usege/find', { observe: 'response' as any, params: { age: 'test' } })
            .pipe(
                catchError((err) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.00');
        // expect(r.error).toBeInstanceOf(ArgumentError)
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(client.send('/device/30/used', { observe: 'response' as any, params: { age: '20' } }));
        expect(a.status).toEqual('2.05');
        expect(a.ok).toBeTruthy();
        expect(a.body).toStrictEqual(30);
    })

    it('route with request restful param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device//used', { observe: 'response' as any, params: { age: '20' } })
            .pipe(
                catchError((err) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.04');
        // expect(r.error).toBeInstanceOf(MissingParameterError);
    })

    it('route with request restful param pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/age1/used', { observe: 'response' as any, params: { age: '20' } })
            .pipe(
                catchError((err) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('4.00');
        // expect(r.error).toBeInstanceOf(ArgumentError);
    })


    it('response with Observable', async () => {
        const r = await lastValueFrom(client.send('/device/status', { observe: 'response' as any, responseType: 'text' as any })
            .pipe(
                catchError((err) => {
                    ctx.getLogger().error(err);
                    return of(err);
                })));
        expect(r.status).toEqual('2.05');
        expect(r.body).toEqual('working');
    })

    // it('redirect', async () => {
    //     const result = 'reload';
    //     const r = await lastValueFrom(client.send('/device/status', { observe: 'response' as any, params: { redirect: 'reload' }, responseType: 'text' as any }));
    //     expect(r.status).toEqual('2.05');
    //     expect(r.body).toEqual(result);
    // })

    it('xxx micro message', async () => {
        const result = 'reload2';
        const r = await lastValueFrom(client.send({ cmd: 'xxx' }, { observe: 'response' as any, payload: { message: result }, responseType: 'text' as any }).pipe(
            catchError((err) => {
                ctx.getLogger().error(err);
                return of(err);
            })));
        expect(r.status).toEqual('2.05');
        expect(r.body).toEqual(result);
    })

    it('dd micro message', async () => {
        const result = 'reload';
        const r = await lastValueFrom(client.send('/dd/status', { observe: 'response' as any, payload: { message: result }, responseType: 'text' as any }).pipe(
            catchError((err) => {
                ctx.getLogger().error(err);
                return of(err);
            })));
        expect(r.status).toEqual('2.05');
        expect(r.body).toEqual(result);
    })

    after(() => {
        return ctx?.destroy();
    })
});
