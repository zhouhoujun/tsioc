import { ServerModule } from '@tsdi/platform-server';
import { ServerLogsModule } from '@tsdi/platform-server/log4js';
import { ServerHttpClientModule } from '@tsdi/platform-server/http';
import { HttpClient, HttpClientModule } from '@tsdi/common/http';
import { LoggerModule } from '@tsdi/logs';
import expect = require('expect');
import { catchError, lastValueFrom, of } from 'rxjs';
import * as net from 'net';
import { ModuleA, ModuleB, ClassSevice, SocketService, StatupModule, TestService } from './demo';
import { Application } from '../src';


describe('di module', () => {

    it('should has bootstrap, and auto wrid mark via inject.', async () => {
        const ctx = await Application.run(ModuleB);
        expect(ctx.instance).not.toBeNull();
        const typeRef = ctx.runners.getRef(ClassSevice);
        expect(typeRef).not.toBeNull();
        
        // console.log(runner.instance);
        expect(typeRef!.getInstance().mark).toEqual('marked');
        await ctx.close();

    });


    // it('message test.', async () => {

    //     const ctx = await Application.run({
    //         module: ModuleB,
    //         uses: [
    //             ServerModule,
    //             HttpClientModule,
    //             ServerHttpClientModule,
    //             HttpModule.withOption({
    //                 majorVersion: 1,
    //                 listenOpts: {
    //                     port: 3200
    //                 }
    //             })
    //         ]
    //     });
    //     const serRef = ctx.runners.attach(HttpServer);
    //     serRef.getInstance().use((ctx, next) => {
    //         console.log('ctx.url:', ctx.url);
    //         if (ctx.url.startsWith('/test')) {
    //             console.log('message queue test: ' + ctx.payload);
    //         }

    //         console.log(ctx.body, ctx.query);
    //         ctx.body = ctx.query.hi;
    //         return next();
    //     }, 0);

    //     await ctx.runners.run(HttpServer);

    //     // has no parent.
    //     const rep = await lastValueFrom(ctx.resolve(HttpClient).request('GET', 'test', { observe: 'response', responseType: 'text', params: { hi: 'hello' } })
    //         .pipe(
    //             catchError((err, ct) => {
    //                 ctx.getLogger().error(err);
    //                 return of(err);
    //             })));
    //     expect(rep.body).toEqual('hello');
    //     expect(rep.status).toEqual(200);

    //     await ctx.close();
    // });

    it('options test.', async () => {
        const ctx = await Application.run({
            module: ModuleB,
            providers: [
                {
                    provide: 'ttk',
                    useValue: 'ccc'
                }
            ]
        });

        expect(ctx.runners.getRef(ClassSevice)?.getInstance()).toBeInstanceOf(ClassSevice);
        expect(ctx.injector.get('ttk')).toEqual('ccc');
        await ctx.close();
    });


    it('can destroy service', async () => {
        const ctx = await Application.run({
            module: ModuleB,
            // deps: [
            //     SocketService
            // ]
            providers: [SocketService]
        });

        const ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        await ctx.close();
        expect(ctx.destroyed).toBeTruthy();
    });

    it('can statup socket service in module', async () => {
        const ctx = await Application.run(StatupModule);
        const ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        await ctx.close();
        expect(ctx.destroyed).toBeTruthy();
    });

    it('can get service via module deps with option', async () => {
        const ctx = await Application.run({
            module: StatupModule,
            uses: [
                LoggerModule
            ],
            deps: [
                ModuleA
            ],
        });
        const ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ctx.injector.get('mark')).toEqual('marked');
        const tsr = ctx.injector.get(TestService);
        expect(tsr).toBeInstanceOf(TestService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        expect(ctx.destroyed).toBeFalsy();
        await ctx.close();
        expect(ctx.destroyed).toBeTruthy();
    });

    it('can statup socket service in module with option', async () => {
        const ctx = await Application.run({
            module: StatupModule,
            uses: [
                LoggerModule
            ],
            deps: [
                ServerLogsModule
            ]
        });
        const ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        expect(ctx.destroyed).toBeFalsy();
        await ctx.close();
        expect(ctx.destroyed).toBeTruthy();
    });

});

