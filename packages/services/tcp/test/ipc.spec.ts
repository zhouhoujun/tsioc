import { Injector, Module, isArray, lang } from '@tsdi/ioc';
import { Application, ApplicationContext, Payload } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { ErrorResponse, Response } from '@tsdi/common';
import { BadRequestExecption } from '@tsdi/common/transport';
import { ClientModule } from '@tsdi/common/client';
import { ServerModule } from '@tsdi/platform-server';
import { ServerEndpointModule } from '@tsdi/platform-server/endpoints';
import { RequestBody, RequestParam, RequestPath, RouteMapping, Handle, MicroServRouterModule, EndpointModule, ContentInterceptor, JsonInterceptor, BodyparserInterceptor, RedirectResult } from '@tsdi/endpoints';
import { catchError, lastValueFrom, of } from 'rxjs';
import * as os from 'os';
import expect = require('expect');
import path = require('path');
import { rm } from 'shelljs';
import { TCP_SERV_INTERCEPTORS, TcpClient, TcpModule } from '../src';
import { BigFileInterceptor } from './BigFileInterceptor';


if (os.platform() != 'win32') {


    @RouteMapping('/device')
    class DeviceController {

        @RouteMapping('/', 'GET')
        list(@RequestParam({ nullable: true }) name: string) {
            return name ? [{ name: '1' }, { name: '2' }].filter(i => i.name === name) : [{ name: '1' }, { name: '2' }];
        }

        @RouteMapping('/init', 'POST')
        req(name: string) {
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
                throw new BadRequestExecption();
            }
            return age1;
        }


        @RouteMapping('/update', 'POST')
        async update(version: string) {
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

        @Handle({ cmd: 'xxx' }, 'tcp')
        async subMessage(@Payload() message: string) {
            return message;
        }

        @Handle('dd/*')
        async subMessage1(@Payload() message: string) {
            return message;
        }

    }

    const ipcpath = path.join(__dirname, 'myipctmp')

    @Module({
        baseURL: __dirname,
        imports: [
            ServerModule,
            LoggerModule,
            ServerEndpointModule,
            ClientModule.register({
                transport: 'tcp',
                clientOpts: {
                    connectOpts: {
                        path: ipcpath
                    }
                }
            }),
            MicroServRouterModule.forRoot('tcp'),
            EndpointModule.register({
                transport: 'tcp',
                serverOpts: {
                    detailError: false,
                    // timeout: 1000,
                    listenOpts: {
                        path: ipcpath
                    },
                    interceptors: [
                        BigFileInterceptor,
                        ContentInterceptor,
                        JsonInterceptor,
                        BodyparserInterceptor,
                        { useExisting: MicroServRouterModule.getToken('tcp') }
                    ]
                },
                providers: [
                    { provide: TCP_SERV_INTERCEPTORS, useClass: BigFileInterceptor, multi: true },
                ]
            }),
        ],
        declarations: [
            DeviceController
        ]
    })
    class IPCTestModule {

    }


    describe('IPC Server & IPC Client', () => {
        let ctx: ApplicationContext;
        let injector: Injector;

        let client: TcpClient;

        before(async () => {
            rm(ipcpath);
            ctx = await Application.run(IPCTestModule);
            injector = ctx.injector;
            client = injector.get(TcpClient);
        });


        it('fetch json', async () => {
            const res: any = await lastValueFrom(client.send('510100_full.json', { method: 'GET' })
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
                        return of(err);
                    })));

            expect(res).toBeDefined();
            expect(isArray(res.features)).toBeTruthy();
        })

        it('fetch big json', async () => {
            const res: any = await lastValueFrom(client.send('content/big.json')
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
                        return of(err);
                    })));

            // expect(res).toBeDefined();
            // expect(isArray(res.features)).toBeTruthy();
            expect(res instanceof ErrorResponse).toBeDefined();
            expect(res.statusMessage).toContain('Packet length 23.74mb great than max size 5mb');
        })

        it('query all', async () => {
            const a = await lastValueFrom(client.send<any[]>('/device')
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
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
                        // ctx.getLogger().error(err);
                        return of(err);
                    })));

            expect(isArray(a)).toBeTruthy();
            expect(a.length).toEqual(1);
            expect(a[0].name).toEqual('2');
        });

        it('not found', async () => {
            const a = await lastValueFrom(client.send('/device/init5', { observe: 'events', method: 'POST', params: { name: 'test' } })
                .pipe(
                    catchError(err => {
                        console.log(err);
                        return of(err)
                    })
                ));
            // expect(a.status).toEqual(404);
            expect(a.statusText).toEqual('Not Found')
        });

        it('bad request', async () => {
            const a = await lastValueFrom(client.send('/device/-1/used', { observe: 'response', params: { age: '20' } })
                .pipe(
                    catchError(err => {
                        console.log(err);
                        return of(err)
                    })
                ));
            // expect(a.status).toEqual(400);
            expect(a.statusText).toEqual('Bad Request')
        })

        it('post route response object', async () => {
            const a = await lastValueFrom(client.send<any>('/device/init', { observe: 'response', method: 'POST', params: { name: 'test' } }));
            // expect(a.status).toEqual(200);
            expect(a.ok).toBeTruthy();
            expect(a.body).toBeDefined();
            expect(a.body.name).toEqual('test');
        });

        it('post route response string', async () => {
            const b = await lastValueFrom(client.send('/device/update', { observe: 'response', responseType: 'text', method: 'POST', params: { version: '1.0.0' } })
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
                        return of(err as Response<any>);
                    })));
            // expect(b.status).toEqual(200);
            expect(b.ok).toBeTruthy();
            expect(b.body).toEqual('1.0.0');
        });

        it('route with request body pipe', async () => {
            const a = await lastValueFrom(client.send<any>('/device/usage', { observe: 'response', method: 'POST', body: { id: 'test1', age: '50', createAt: '2021-10-01' } })
                .pipe(
                    catchError(err => {
                        console.log(err);
                        return of(err);
                    })
                ));
            // a.error && console.log(a.error);
            // expect(a.status).toEqual(200);
            expect(a.ok).toBeTruthy();
            expect(a.body).toBeDefined();
            expect(a.body.year).toStrictEqual(50);
            expect(new Date(a.body.createAt)).toEqual(new Date('2021-10-01'));
        })

        it('route with request body pipe throw missing argument err', async () => {
            const r = await lastValueFrom(client.send('/device/usage', { observe: 'response', method: 'POST' })
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
                        return of(err);
                    })));
            // expect(r.status).toEqual(400);
            expect(r.statusText).toEqual('Bad Request')
        })

        it('route with request body pipe throw argument err', async () => {
            const r = await lastValueFrom(client.send('/device/usage', { observe: 'response', method: 'POST', body: { id: 'test1', age: 'test', createAt: '2021-10-01' } })
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
                        return of(err);
                    })));
            // expect(r.status).toEqual(400);
            expect(r.statusText).toEqual('Bad Request')
        })

        it('route with request param pipe', async () => {
            const a = await lastValueFrom(client.send('/device/usege/find', { observe: 'response', params: { age: '20' } }));
            // expect(a.status).toEqual(200);
            expect(a.ok).toBeTruthy();
            expect(a.body).toStrictEqual(20);
        })

        it('route with request param pipe throw missing argument err', async () => {
            const r = await lastValueFrom(client.send('/device/usege/find', { observe: 'response' })
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
                        return of(err);
                    })));
            // expect(r.status).toEqual(400);
            expect(r.statusText).toEqual('Bad Request')
        })

        it('route with request param pipe throw argument err', async () => {
            const r = await lastValueFrom(client.send('/device/usege/find', { observe: 'response', params: { age: 'test' } })
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
                        return of(err);
                    })));
            // expect(r.status).toEqual(400);
            expect(r.statusText).toEqual('Bad Request')
        })

        it('route with request param pipe', async () => {
            const a = await lastValueFrom(client.send('/device/30/used', { observe: 'response', params: { age: '20' } }));
            // expect(a.status).toEqual(200);
            expect(a.ok).toBeTruthy();
            expect(a.body).toStrictEqual(30);
        })

        it('route with request restful param pipe throw missing argument err', async () => {
            const r = await lastValueFrom(client.send('/device//used', { observe: 'response', params: { age: '20' } })
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
                        return of(err);
                    })));
            // expect(r.status).toEqual(400);
            expect(r.statusText).toEqual('Bad Request')
        })

        it('route with request restful param pipe throw argument err', async () => {
            const r = await lastValueFrom(client.send('/device/age1/used', { observe: 'response', params: { age: '20' } })
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
                        return of(err);
                    })));
            // expect(r.status).toEqual(400);
            expect(r.statusText).toEqual('Bad Request')
        })


        it('response with Observable', async () => {
            const r = await lastValueFrom(client.send('/device/status', { observe: 'response', responseType: 'text' })
                .pipe(
                    catchError((err, ct) => {
                        // ctx.getLogger().error(err);
                        return of(err as Response<any, number>);
                    })));
            // expect(r.status).toEqual(200);
            expect(r.ok).toBeTruthy();
            expect(r.body).toEqual('working');
        })

        it('redirect', async () => {
            const result = 'reload';
            const r = await lastValueFrom(client.send('/device/status', { observe: 'response', params: { redirect: 'reload' }, responseType: 'text' }).pipe(
                catchError((err, ct) => {
                    // ctx.getLogger().error(err);
                    return of(err);
                })));
            // expect(r.status).toEqual(200);
            // expect(r.ok).toBeTruthy();
            // expect(r.body).toEqual(result);
            expect(r.statusText).toEqual('Not Supported')
        })

        it('xxx micro message', async () => {
            const result = 'reload2';
            const r = await lastValueFrom(client.send({ cmd: 'xxx' }, { observe: 'response', payload: { message: result }, responseType: 'text' }).pipe(
                catchError((err, ct) => {
                    // ctx.getLogger().error(err);
                    return of(err as Response<any, number>);
                })));
            // expect(r.status).toEqual(200);
            expect(r.ok).toBeTruthy();
            expect(r.body).toEqual(result);
        })

        it('dd micro message', async () => {
            const result = 'reload';
            const r = await lastValueFrom(client.send('/dd/status', { observe: 'response', payload: { message: result }, responseType: 'text' }).pipe(
                catchError((err, ct) => {
                    // ctx.getLogger().error(err);
                    return of(err as Response<any, number>);
                })));
            // expect(r.status).toEqual(200);
            expect(r.ok).toBeTruthy();
            expect(r.body).toEqual(result);
        })




        after(async () => {
            await ctx?.destroy();
            rm(ipcpath);
        })
    });

}