import { Injector, Module, isArray, lang } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { ServerModule } from '@tsdi/platform-server';
import { BadRequestException, Transport } from '@tsdi/common';
import { provideClient, withTimeout, withInterceptors, withTransfers } from '@tsdi/client';
import { ServerCommonModule } from '@tsdi/platform-server/common';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import { Handle, Payload, provideService, RedirectResult, RequestBody, RequestParam, RequestPath, RouteMapping, useBodyParser, useContent, useInterceptors, useJson, useLogger, useRouter } from '@tsdi/service';
import { TcpClient, withTcpTransport, useTcpTransport } from '../src';

import { BigFileInterceptor } from './BigFileInterceptor';



@RouteMapping('/device')
export class DeviceController {

    @RouteMapping('/', 'GET')
    list(@RequestParam({ nullable: true }) name: string) {
        return name ? [{ name: '1' }, { name: '2' }].filter(i => i.name === name) : [{ name: '1' }, { name: '2' }];
    }

    @RouteMapping('/init', 'POST')
    req(@RequestParam('name') name: string) {
        console.log('DeviceController init:', name);
        return { name };
    }

    @RouteMapping('/usage', 'POST')
    age(@RequestBody() id: string, @RequestBody('age', { pipe: 'int' }) year: number, @RequestBody({ pipe: 'date' }) createAt: Date) {
        console.log('usage:', id, year, createAt);
        return { id, year, createAt };
    }

    @RouteMapping('/usege/find', 'GET')
    agela(@RequestParam('age', { pipe: 'int' }) limit: number) {
        console.log('limit:', limit);
        return limit;
    }

    @RouteMapping('/:age/used', 'GET')
    resfulquery(@RequestPath('age', { pipe: 'int' }) age1: number) {
        console.log('age1:', age1);
        if (age1 <= 0) {
            throw new BadRequestException();
        }
        return age1;
    }


    @RouteMapping('/update', 'POST')
    async update(@RequestParam('version') version: string) {
        // do smth.
        console.log('update version:', version);
        const defer = lang.defer();

        setTimeout(() => {
            defer.resolve(version);
        }, 10);

        return await defer.promise;
    }

    @RouteMapping('/status', 'GET')
    getLastStatus(@RequestParam('redirect', { nullable: true }) redirect: string) {
        if (redirect === 'reload') {
            return new RedirectResult('/device/reload');
        }
        return of('working');
    }

    @RouteMapping('/reload', 'GET')
    redirect() {
        return 'reload';
    }

    @Handle({ cmd: 'xxx' }, Transport.TCP)
    async subMessage(@Payload() message: string) {
        return message;
    }

    @Handle('dd/*')
    async subMessage1(@Payload() message: string) {
        return message;
    }

}

@RouteMapping('/content')
class ContentController {
    @RouteMapping('/510100_full.json', 'GET')
    json() {
        return { features: ['feature-a', 'feature-b'] };
    }
}

@Module({
    baseURL: __dirname,
    imports: [
        ServerModule,
        LoggerModule,
        ServerCommonModule
    ],
    providers: [
        provideClient(
            withTimeout(3000),
            withInterceptors(),
            withTransfers(),
            withTcpTransport(
                {
                    name: 'tcp-client',
                    connectOpts: {
                        port: 3000
                    }
                },
                {
                    name: 'micclient',
                    microservice: true,
                    connectOpts: {
                        port: 3001
                    }
                }
            )
        ),
        provideService(
            useInterceptors(BigFileInterceptor),
            useRouter(),
            useLogger(),
            useTcpTransport(
                {
                    name: 'host',
                    listenOpts: {
                        port: 3000
                    }
                },
                {
                    name: 'micro',
                    microservice: true,
                    listenOpts: {
                        port: 3001
                    }
                }
            )
        ),
    ],
    declarations: [
        DeviceController,
        ContentController
    ]
})
export class TcpTestModule {

}


describe('TCP Server & TCP Client', () => {
    let ctx: ApplicationContext;
    let injector: Injector;

    let client: TcpClient;
    let micclient: TcpClient | null;

    before(async () => {
        ctx = await Application.run(TcpTestModule);
        client = ctx.get(TcpClient);
        micclient = ctx.get(TcpClient, null, { name: 'micclient' } as any);
        await new Promise(resolve => setTimeout(resolve, 300));
    });


    it('fetch json', async () => {
        const res: any = await lastValueFrom(client.send('/content/510100_full.json', { method: 'GET', responseType: 'json' })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));

        expect(res).toBeDefined();
        expect(isArray(res.features)).toBeTruthy();
    })

    it('fetch big json', async () => {
        const res: any = await lastValueFrom(client.send('content/big.json')
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));

        console.log('tcp-fetch-big-json', res);
        expect(res).toBeDefined();
        expect(isArray(res.features)).toBeTruthy();
    })

    it('query all', async () => {
        const a = await lastValueFrom(client.send<any[]>('/device')
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
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
                    //  ctx.getLogger().error(err);
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
        // expect(a.status).toEqual(404);
        expect(a.statusMessage).toEqual('Not Found')
    });

    it('bad request', async () => {
        const a = await lastValueFrom(client.send('/device/-1/used', { observe: 'response' as any, params: { age: '20' } })
            .pipe(
                catchError(err => {
                    console.log(err);
                    return of(err)
                })
            ));
        // expect(a.status).toEqual(400);
        expect(a.statusMessage).toEqual('Bad Request')
    })

    it('post route response object', async () => {
        const a = await lastValueFrom(client.send<any>('/device/init', { observe: 'response' as any, method: 'POST', params: { name: 'test' } }));
        // expect(a.status).toEqual(200);
        expect(a.body).toBeDefined();
        expect(a.body).toBeDefined();
        expect(a.body.name).toEqual('test');
    });

    it('post route response string', async () => {
        const b = await lastValueFrom(client.send('/device/update', { observe: 'response' as any, responseType: 'text' as any, method: 'POST', params: { version: '1.0.0' } })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));
        // expect(b.status).toEqual(200);
        expect(b.ok).toBeTruthy();
        expect(b.body).toEqual('1.0.0');
    });

    it('route with request body pipe', async () => {
        const a = await lastValueFrom(client.send<any>('/device/usage', { observe: 'response' as any, method: 'POST', body: { id: 'test1', age: '50', createAt: '2021-10-01' } }).pipe(
            catchError((err, ct) => {
                //  ctx.getLogger().error(err);
                return of(err);
            })));
        // a.error && console.log(a.error);
        // expect(a.status).toEqual(200);
        expect(a.body).toBeDefined();
        expect(a.body).toBeDefined();
        expect(a.body.year).toStrictEqual(50);
        expect(new Date(a.body.createAt)).toEqual(new Date('2021-10-01'));
    })

    it('route with request body pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usage', { observe: 'response' as any, method: 'POST' })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));
        // expect(r.status).toEqual(400);
        expect(r.statusMessage).toEqual('Bad Request')
    })

    it('route with request body pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usage', { observe: 'response' as any, method: 'POST', body: { id: 'test1', age: 'test', createAt: '2021-10-01' } })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));
        // expect(r.status).toEqual(400);
        expect(r.statusMessage).toEqual('Bad Request')
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(client.send('/device/usege/find', { observe: 'response' as any, params: { age: '20' } }));
        // expect(a.status).toEqual(200);
        expect(a.body).toBeDefined();
        expect(a.body).toStrictEqual(20);
    })

    it('route with request param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usege/find', { observe: 'response' as any })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));
        // expect(r.status).toEqual(400);
        expect(r.statusMessage).toEqual('Bad Request')
    })

    it('route with request param pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/usege/find', { observe: 'response' as any, params: { age: 'test' } })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));
        // expect(r.status).toEqual(400);
        expect(r.statusMessage).toEqual('Bad Request')
    })

    it('route with request param pipe', async () => {
        const a = await lastValueFrom(client.send('/device/30/used', { observe: 'response' as any, params: { age: '20' } }));
        // expect(a.status).toEqual(200);
        expect(a.body).toBeDefined();
        expect(a.body).toStrictEqual(30);
    })

    it('route with request restful param pipe throw missing argument err', async () => {
        const r = await lastValueFrom(client.send('/device//used', { observe: 'response' as any, params: { age: '20' } })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));
        // expect(r.status).toEqual(404);
        expect(r.statusMessage).toEqual('Not Found')
    })

    it('route with request restful param pipe throw argument err', async () => {
        const r = await lastValueFrom(client.send('/device/age1/used', { observe: 'response' as any, params: { age: '20' } })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));
        // expect(r.status).toEqual(400);
        expect(r.statusMessage).toEqual('Bad Request')
    })


    it('response with Observable', async () => {
        const r = await lastValueFrom(client.send('/device/status', { observe: 'response' as any, responseType: 'text' as any })
            .pipe(
                catchError((err, ct) => {
                    //  ctx.getLogger().error(err);
                    return of(err);
                })));
        // expect(r.status).toEqual(200);
        expect(r.body).toEqual('working');
    })

    it('redirect', async () => {
        const result = 'reload';
        const r = await lastValueFrom(client.send('/device/status', { observe: 'response' as any, params: { redirect: 'reload' }, responseType: 'text' as any }).pipe(
            catchError((err, ct) => {
                //  ctx.getLogger().error(err);
                return of(err);
            })));
        // expect(r.status).toEqual(200);
        // expect(r.body).toEqual(result);
        expect(r.statusMessage).toEqual('Not Supported')
    })

    it('xxx micro message', async () => {
        const result = 'reload2';
        const r = await lastValueFrom(micclient!.send({ cmd: 'xxx' }, { observe: 'response' as any, payload: { message: result }, responseType: 'text' as any }).pipe(
            catchError((err, ct) => {
                //  ctx.getLogger().error(err);
                return of(err);
            })));
        console.log('tcp-xxx-micro', r);
        // expect(r.status).toEqual(200);
        expect(r.body).toEqual(result);
    })

    it('dd micro message', async () => {
        const result = 'reload';
        const r = await lastValueFrom(micclient!.send('/dd/status', { observe: 'response' as any, payload: { message: result }, responseType: 'text' as any }).pipe(
            catchError((err, ct) => {
                //  ctx.getLogger().error(err);
                return of(err);
            })));
        // expect(r.status).toEqual(200);
        expect(r.body).toEqual(result);
    })

    after(() => {
        return ctx.destroy();
    })
});
