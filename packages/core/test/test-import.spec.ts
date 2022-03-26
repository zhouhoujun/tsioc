import { ServerLogsModule } from '@tsdi/platform-server';
import expect = require('expect');
import * as net from 'net';
import { ModuleA, ModuleB, ClassSevice, SocketService, StatupModule, TestService } from './demo';
import { Application, HttpClient, LoggerModule, Router } from '../src';
import { lastValueFrom } from 'rxjs';


describe('di module', () => {

    it('should has bootstrap, and auto wrid mark via inject.', async () => {
        let ctx = await Application.run(ModuleB);
        expect(ctx.instance).not.toBeNull();
        expect(ctx.runners.bootstraps[0]).not.toBeNull();
        const runner = ctx.runners.bootstraps[0];
        // console.log(runner.instance);
        expect(runner.instance.mark).toEqual('marked');
        await ctx.destroy();

    });


    it('message test.', async () => {
        let ctx = await Application.run(ModuleB);
        let router = ctx.resolve(Router);
        // router?.use((ctx, next) => {
        //     console.log('ctx.pattern:', ctx.pattern);
        //     if (ctx.pattern.startsWith('/test')) {
        //         console.log('message queue test: ' + ctx.request.body);
        //         ctx.body = ctx.request.query.hi;
        //         console.log(ctx.body, ctx.request.query);
        //     }
        //     return next()
        // });

        // has no parent.
        const rep = await lastValueFrom(ctx.resolve(HttpClient).send('test', { observe: 'response', params: { hi: 'hello' } }));
        expect(rep.body).toEqual('hello');
        expect(rep.status).toEqual(200);

        await ctx.destroy();
    });

    it('options test.', async () => {
        let ctx = await Application.run({
            module: ModuleB,
            providers: [
                {
                    provide: 'ttk',
                    useValue: 'ccc'
                }
            ]
        });

        expect(ctx.runners.bootstraps[0].instance).toBeInstanceOf(ClassSevice);
        expect(ctx.injector.get('ttk')).toEqual('ccc');
        await ctx.destroy();
    });


    it('can destroy service', async () => {
        let ctx = await Application.run({
            module: ModuleB,
            // deps: [
            //     SocketService
            // ]
            providers: [SocketService]
        });

        let ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        await ctx.destroy();
        expect(ctx.destroyed).toBeTruthy();
    });

    it('can statup socket service in module', async () => {
        let ctx = await Application.run(StatupModule);
        let ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        await ctx.destroy();
        expect(ctx.destroyed).toBeTruthy();
    });

    it('can get service via module deps with option', async () => {
        let ctx = await Application.run({
            module: StatupModule,
            deps: [
                LoggerModule.withOptions(null, true),
                ModuleA
            ]
        });
        let ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ctx.injector.get('mark')).toEqual('marked');
        let tsr = ctx.injector.get(TestService);
        expect(tsr).toBeInstanceOf(TestService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        expect(ctx.destroyed).toBeFalsy();
        await ctx.destroy();
        expect(ctx.destroyed).toBeTruthy();
    });

    it('can statup socket service in module with option', async () => {
        let ctx = await Application.run({
            module: StatupModule,
            deps:[
                LoggerModule.withOptions(null, true),
                ServerLogsModule
            ]
        });
        let ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        expect(ctx.destroyed).toBeFalsy();
        await ctx.destroy();
        expect(ctx.destroyed).toBeTruthy();
    });

});

