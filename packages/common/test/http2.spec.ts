// import { Injector, Injectable, lang, tokenId, isArray } from '@tsdi/ioc';
// import { catchError, lastValueFrom, of } from 'rxjs';
// import { RedirectResult } from '@tsdi/transport';
// import { HttpModule, HttpServer } from '@tsdi/transport-http';
// import { ServerModule } from '@tsdi/platform-server';
// import { ServerHttpClientModule } from '@tsdi/platform-server-common';
// import expect = require('expect');
// import * as fs from 'fs';
// import * as path from 'path';
// import {
//     Application, RouteMapping, ApplicationContext, Handle, RequestBody, RequestParam, RequestPath, Module,
//     ConnectionContext, LoggerModule, Middleware, Chain, BadRequestError
// } from '@tsdi/core';
// import { HttpClient, HttpClientModule } from '../src';

// @RouteMapping('/device')
// class DeviceController {

//     @RouteMapping('/init', 'POST')
//     req(name: string) {
//         console.log('DeviceController init:', name);
//         return { name };
//     }

//     @RouteMapping('/usage', 'POST')
//     age(id: string, @RequestBody('age', { pipe: 'int' }) year: number, @RequestBody({ pipe: 'date' }) createAt: Date) {
//         console.log('usage:', id, year, createAt);
//         return { id, year, createAt };
//     }

//     @RouteMapping('/usege/find', 'GET')
//     agela(@RequestParam('age', { pipe: 'int' }) limit: number) {
//         console.log('limit:', limit);
//         return limit;
//     }

//     @RouteMapping('/:age/used', 'GET')
//     resfulquery(@RequestPath('age', { pipe: 'int' }) age1: number) {
//         console.log('age1:', age1);
//         if (age1 <= 0) {
//             throw new BadRequestError();
//         }
//         return age1;
//     }


//     @RouteMapping('/update', 'POST')
//     async update(version: string) {
//         // do smth.
//         console.log('update version:', version);
//         const defer = lang.defer();

//         setTimeout(() => {
//             defer.resolve(version);
//         }, 10);

//         return await defer.promise;
//     }


//     @RouteMapping('/status', 'GET')
//     getLastStatus(@RequestParam('redirect', { nullable: true }) redirect: string) {
//         if (redirect === 'reload') {
//             return new RedirectResult('/device/reload');
//         }
//         return of('working');
//     }

//     @RouteMapping('/reload', 'GET')
//     redirect() {
//         return 'reload';
//     }

//     @Handle({ cmd: 'xxx' })
//     async subMessage() {

//     }

//     @Handle(/dd./)
//     async subMessage1() {

//     }




// }

// // @RouteMapping('/map')
// // class MapController {

// //     @Inject() mapAdapter: MapAdapter;

// //     @RouteMapping('/mark', 'POST')
// //     drawMark(name: string, @Inject(CONTEXT) ctx: MessageContext ) {
// //         ctx.body;
// //         this.mapAdapter.drow(ctx.body);
// //     }

// // }

// @Handle('/hdevice')
// class DeviceQueue implements Middleware {

//     async invoke(ctx: ConnectionContext, next: () => Promise<void>): Promise<void> {

//         console.log('device msg start.');
//         ctx.setValue('device', 'device data')


//         console.log('device msg start.');
//         ctx.setValue('device', 'device data')
//         await new Chain(ctx.resolve(DEVICE_MIDDLEWARES)).invoke(ctx);
//         ctx.setValue('device', 'device next');

//         const device = ctx.get('device');
//         const deviceA_state = ctx.get('deviceA_state');
//         const deviceB_state = ctx.get('deviceB_state');

//         ctx.body = {
//             device,
//             deviceA_state,
//             deviceB_state
//         };

//         console.log('device sub msg done.');
//         return await next();
//     }
// }


// @Injectable()
// class DeviceStartupHandle implements Middleware {

//     invoke(ctx: ConnectionContext, next: () => Promise<void>): Promise<void> {

//         console.log('DeviceStartupHandle.', 'resp:', ctx.playload.type, 'req:', ctx.playload.type)
//         if (ctx.playload.type === 'startup') {
//             // todo sth.
//             const ret = ctx.injector.get(MyService).dosth();
//             ctx.setValue('deviceB_state', ret);
//         }
//         return next();
//     }
// }

// @Injectable()
// class DeviceAStartupHandle implements Middleware {

//     invoke(ctx: ConnectionContext, next: () => Promise<void>): Promise<void> {
//         console.log('DeviceAStartupHandle.', 'resp:', ctx.playload.type, 'req:', ctx.playload.type)
//         if (ctx.playload.type === 'startup') {
//             // todo sth.
//             const ret = ctx.get(MyService).dosth();
//             ctx.setValue('deviceA_state', ret);
//         }
//         return next();
//     }
// }

// export const DEVICE_MIDDLEWARES = tokenId<Middleware[]>('DEVICE_MIDDLEWARES');

// @Module({
//     providers: [
//         DeviceQueue,
//         { provide: DEVICE_MIDDLEWARES, useClass: DeviceStartupHandle, multi: true },
//         { provide: DEVICE_MIDDLEWARES, useClass: DeviceAStartupHandle, multi: true },

//     ]
// })
// class DeviceManageModule {

// }

// @Injectable()
// class MyService {
//     dosth() {
//         return 'startuped';
//     }
// }

// @Module({
//     providers: [
//         MyService,
//         DeviceAStartupHandle
//     ]
// })
// class DeviceAModule {

// }


// const key = fs.readFileSync(path.join(__dirname, '../../../cert/localhost-privkey.pem'));
// const cert = fs.readFileSync(path.join(__dirname, '../../../cert/localhost-cert.pem'));


// @Module({
//     baseURL: __dirname,
//     imports: [
//         ServerModule,
//         LoggerModule,
//         // TcpModule,
//         HttpModule.withOption({
//             majorVersion: 2,
//             options: {
//                 allowHTTP1: true,
//                 key,
//                 cert
//             }
//         }),
//         HttpClientModule,
//         ServerHttpClientModule,
//         DeviceManageModule,
//         DeviceAModule
//     ],
//     providers: [
//         // DeviceController,
//         DeviceStartupHandle
//     ],
//     declarations: [
//         DeviceController
//     ],
//     bootstrap: HttpServer
// })
// class MainApp {

// }

// describe('HttpClient for HTTP 2.0', () => {
//     let ctx: ApplicationContext;
//     let injector: Injector;

//     before(async () => {
//         ctx = await Application.run(MainApp);
//         injector = ctx.injector;
//     });

//     it('make sure singleton', async () => {
//         // ctx.send('msg://decice/init', { body: {mac: 'xxx-xx-xx-xxxx'}, query: {name:'xxx'} })
//         // console.log(ctx.getMessager());
//         const a = injector.get(DeviceQueue);
//         const b = injector.get(DeviceQueue);
//         expect(a).toBeInstanceOf(DeviceQueue);
//         expect(a).toEqual(b);
//     });

//     it('has registered', async () => {
//         const a = injector.get(DEVICE_MIDDLEWARES);
//         expect(a[0]).toBeInstanceOf(DeviceStartupHandle);
//         expect(a[1]).toBeInstanceOf(DeviceAStartupHandle);
//     });


//     it('fetch json', async () => {

//         const client = ctx.resolve(HttpClient);
//         const res: any = await lastValueFrom(client.get('510100_full.json')
//             .pipe(
//                 catchError((err, ct) => {
//                     ctx.getLogger().error(err);
//                     return of(err);
//                 })));

//         expect(res).toBeDefined();
//         expect(isArray(res.features)).toBeTruthy();
//     })

//     it('msg work', async () => {
//         const client = ctx.resolve(HttpClient);
//         const rep = await lastValueFrom(client.request<any>('POST', '/hdevice', { observe: 'response', body: { type: 'startup' } }));
//         const device = rep.body['device'];
//         const aState = rep.body['deviceA_state'];
//         const bState = rep.body['deviceB_state'];

//         expect(device).toBe('device next');
//         expect(aState).toBe('startuped');
//         expect(bState).toBe('startuped');
//     });

//     it('not found', async () => {
//         const client = ctx.resolve(HttpClient);
//         const a = await lastValueFrom(client.post<any>('/device/init5', null, { observe: 'response', params: { name: 'test' } })
//             .pipe(
//                 catchError(err => {
//                     console.log(err);
//                     return of(err)
//                 })
//             ));
//         expect(a.status).toEqual(404);
//     });

//     it('bad request', async () => {
//         const client = ctx.resolve(HttpClient);
//         const a = await lastValueFrom(client.get('/device/-1/used', { observe: 'response', params: { age: '20' } })
//             .pipe(
//                 catchError(err => {
//                     console.log(err);
//                     return of(err)
//                 })
//             ));
//         expect(a.status).toEqual(400);
//     })

//     it('post route response object', async () => {
//         const a = await lastValueFrom(ctx.resolve(HttpClient).post<any>('/device/init', null, { observe: 'response', params: { name: 'test' } }));
//         expect(a.status).toEqual(200);
//         expect(a.ok).toBeTruthy();
//         expect(a.body).toBeDefined();
//         expect(a.body.name).toEqual('test');
//     });

//     it('post route response string', async () => {
//         const b = await lastValueFrom(ctx.resolve(HttpClient).post('/device/update', null, { observe: 'response', responseType: 'text', params: { version: '1.0.0' } })
//             .pipe(
//                 catchError((err, ct) => {
//                     ctx.getLogger().error(err);
//                     return of(err);
//                 })));
//         expect(b.status).toEqual(200);
//         expect(b.ok).toBeTruthy();
//         expect(b.body).toEqual('1.0.0');
//     });

//     it('route with request body pipe', async () => {
//         const a = await lastValueFrom(ctx.resolve(HttpClient).post<any>('/device/usage', { id: 'test1', age: '50', createAt: '2021-10-01' }, { observe: 'response' }));
//         // a.error && console.log(a.error);
//         expect(a.status).toEqual(200);
//         expect(a.ok).toBeTruthy();
//         expect(a.body).toBeDefined();
//         expect(a.body.year).toStrictEqual(50);
//         expect(new Date(a.body.createAt)).toEqual(new Date('2021-10-01'));
//     })

//     it('route with request body pipe throw missing argument err', async () => {
//         const r = await lastValueFrom(ctx.resolve(HttpClient).post('/device/usage', {}, { observe: 'response' })
//             .pipe(
//                 catchError((err, ct) => {
//                     ctx.getLogger().error(err);
//                     return of(err);
//                 })));
//         expect(r.status).toEqual(400);
//         // expect(r.error).toBeInstanceOf(MissingParameterError)
//     })

//     it('route with request body pipe throw argument err', async () => {
//         const r = await lastValueFrom(ctx.resolve(HttpClient).post('/device/usage', { id: 'test1', age: 'test', createAt: '2021-10-01' }, { observe: 'response' })
//             .pipe(
//                 catchError((err, ct) => {
//                     ctx.getLogger().error(err);
//                     return of(err);
//                 })));
//         expect(r.status).toEqual(500);
//         // expect(r.error).toBeInstanceOf(ArgumentError)
//     })

//     it('route with request param pipe', async () => {
//         const a = await lastValueFrom(ctx.resolve(HttpClient).get('/device/usege/find', { observe: 'response', params: { age: '20' } }));
//         expect(a.status).toEqual(200);
//         expect(a.ok).toBeTruthy();
//         expect(a.body).toStrictEqual(20);
//     })

//     it('route with request param pipe throw missing argument err', async () => {
//         const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device/usege/find', { observe: 'response' })
//             .pipe(
//                 catchError((err, ct) => {
//                     ctx.getLogger().error(err);
//                     return of(err);
//                 })));
//         expect(r.status).toEqual(400);
//         // expect(r.error).toBeInstanceOf(MissingParameterError)
//     })

//     it('route with request param pipe throw argument err', async () => {
//         const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device/usege/find', { observe: 'response', params: { age: 'test' } })
//             .pipe(
//                 catchError((err, ct) => {
//                     ctx.getLogger().error(err);
//                     return of(err);
//                 })));
//         expect(r.status).toEqual(500);
//         // expect(r.error).toBeInstanceOf(ArgumentError)
//     })

//     it('route with request param pipe', async () => {
//         const a = await lastValueFrom(ctx.resolve(HttpClient).get('/device/30/used', { observe: 'response', params: { age: '20' } }));
//         expect(a.status).toEqual(200);
//         expect(a.ok).toBeTruthy();
//         expect(a.body).toStrictEqual(30);
//     })

//     it('route with request restful param pipe throw missing argument err', async () => {
//         const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device//used', { observe: 'response', params: { age: '20' } })
//             .pipe(
//                 catchError((err, ct) => {
//                     ctx.getLogger().error(err);
//                     return of(err);
//                 })));
//         expect(r.status).toEqual(400);
//         // expect(r.error).toBeInstanceOf(MissingParameterError);
//     })

//     it('route with request restful param pipe throw argument err', async () => {
//         const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device/age1/used', { observe: 'response', params: { age: '20' } })
//             .pipe(
//                 catchError((err, ct) => {
//                     ctx.getLogger().error(err);
//                     return of(err);
//                 })));
//         expect(r.status).toEqual(500);
//         // expect(r.error).toBeInstanceOf(ArgumentError);
//     })


//     it('response with Observable', async () => {
//         const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device/status', { observe: 'response', responseType: 'text' }));
//         expect(r.status).toEqual(200);
//         expect(r.body).toEqual('working');
//     })

//     it('redirect', async () => {
//         const result = 'reload';
//         const r = await lastValueFrom(ctx.resolve(HttpClient).get('/device/status', { observe: 'response', params: { redirect: 'reload' }, responseType: 'text' }));
//         expect(r.status).toEqual(200);
//         expect(r.body).toEqual(result);
//     })

//     after(() => {
//         return ctx.destroy();
//     })
// });
