import { ModuleA, ModuleB, ClassSevice, SubMessageQueue, SocketService, StatupModule, TestService } from './demo';
import { Application, RootMessageQueue, ROOT_QUEUE, Runner,  } from '../src';
import expect = require('expect');
import * as net from 'net';


describe('di module', () => {

    it('should has bootstrap, and auto wrid mark via inject.', async () => {
        try {
        let ctx = await Application.run(ModuleB);
        expect(ctx.instance).not.toBeNull();
        expect(ctx.bootstraps[0]).not.toBeNull();
        // expect(md.bootstrap).to.eq(ClassSevice);
        // expect(md.container).to.not.undefined;
        // expect(md.container.has('mark')).to.true;
        const runner = ctx.bootstraps[0] as Runner;
        // console.log(runner.instance);
        expect(runner.instance.mark).toEqual('marked');
        // expect(md.state).eq('started');
        ctx.destroy();
        } catch (err) {
            console.log(err);
        }
    });


    it('message test.', async () => {
        let ctx = await Application.run(ModuleB);
        let q = ctx.injector.get(SubMessageQueue);
        q.subscribe((ctx, next) => {
            console.log('ctx.url:', ctx.url);
            if (ctx.url.startsWith('/test')) {
                console.log('message queue test: ' + ctx.request.body);
                ctx.body = ctx.request.query.hi;
                console.log(ctx.body, ctx.request.query);
            }
            return next()
        });
        let qb = ctx.injector.get(SubMessageQueue);
        expect(q === qb).toBeTruthy();
        expect(qb['handles'].length).toEqual(1);
        // has no parent.
        expect(ctx.getMessager().has(SubMessageQueue)).toBeFalsy();
        const rep = await qb.send('test', { query: {hi: 'hello'} });
        expect(rep.body).toEqual('hello');
        expect(rep.status).toEqual(200);

        ctx.destroy();
    });

    it('options test.', async () => {
        let ctx = await Application.run({
            type: ModuleB,
            providers: [
                {
                    provide: 'ttk',
                    useValue: 'ccc'
                }
            ]
        });

        expect((ctx.bootstraps[0] as Runner).instance).toBeInstanceOf(ClassSevice);
        expect(ctx.injector.get('ttk')).toEqual('ccc');
        ctx.destroy();
    });


    it('can destory service', async () => {
        let ctx = await Application.run({
            type: ModuleB,
            // deps: [
            //     SocketService
            // ]
            providers: [SocketService]
        });

        let ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        expect(ser.destroyed).toBeFalsy();
        ctx.destroy();
        expect(ctx.destroyed).toBeTruthy();
        expect(ser.destroyed).toBeTruthy();
    });

    it('can statup socket service in module', async () => {
        let ctx = await Application.run(StatupModule);
        let ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        expect(ser.destroyed).toBeFalsy();
        ctx.destroy();
        expect(ctx.destroyed).toBeTruthy();
        expect(ser.destroyed).toBeTruthy();
    });

    it('can statup socket service in module with option', async () => {
        let ctx = await Application.run({
            type: StatupModule,
            configures: [
                { debug: true }
            ]
        });
        let ser = ctx.injector.get(SocketService);
        expect(ser.destroyed).toEqual(false);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server)
        ctx.destroy();
        expect(ctx.destroyed).toBeTruthy();
        expect(ser.destroyed).toBeTruthy();
    });


    it('can get service via module deps with option', async () => {
        let ctx = await Application.run({
            type: StatupModule,
            configures: [
                { debug: true }
            ],
            deps: [
                ModuleA
            ]
        });
        let ser = ctx.injector.get(SocketService);
        expect(ser).toBeInstanceOf(SocketService);
        expect(ser.destroyed).toEqual(false);
        expect(ctx.injector.get('mark')).toEqual('marked');
        let tsr = ctx.injector.get(TestService);
        expect(tsr).toBeInstanceOf(TestService);
        expect(ser.tcpServer).toBeInstanceOf(net.Server);
        ctx.destroy();
        expect(ser.destroyed).toEqual(true);
    })

});

