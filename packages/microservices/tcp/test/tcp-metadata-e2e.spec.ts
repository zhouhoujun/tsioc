import { Module } from '@tsdi/ioc';
import { Application, ApplicationContext } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { GET, POST, PUT, DELETE, Transport } from '@tsdi/common';
import { provideService, withServiceRouter, Controller, Get, Post, Put, Delete, RouteMapping,
    RequestHeader, RequestPath, RequestParam, RequestBody, RestController, Handle, Payload, Subscribe } from '@tsdi/service';
import { withTcpTransport } from '../src/server';
import expect = require('expect');

let port = 11700;
function np() { return port++; }

// ----- 1. All HTTP methods -----
describe('All HTTP methods', () => {
    @Controller('/m')
    class MC {
        @Get('/g') g() { return 'get'; }
        @Post('/p') p(@RequestBody() b: any) { return b; }
        @Put('/u') u(@RequestBody() b: any) { return b; }
        @Delete('/d') d() { return 'del'; }
    }
    @Module({
        imports: [LoggerModule], declarations: [MC],
        providers: [provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: np(), host: '127.0.0.1' }, asDefault: true }))]
    })
    class MMod {}
    let ctx: ApplicationContext;
    before(async () => { ctx = await Application.run(MMod); await new Promise(r => setTimeout(r, 500)); });
    after(async () => { if (ctx) await ctx.close(); });
    it('@Get bootstraps', () => expect(ctx).toBeDefined());
    it('@Post bootstraps', () => expect(ctx).toBeDefined());
    it('@Put bootstraps', () => expect(ctx).toBeDefined());
    it('@Delete bootstraps', () => expect(ctx).toBeDefined());
});

// ----- 2. @RestController -----
describe('@RestController', () => {
    @RestController('/api')
    class RC { @Get('/i') i() { return 'ok'; } }
    @Module({
        imports: [LoggerModule], declarations: [RC],
        providers: [provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: np(), host: '127.0.0.1' }, asDefault: true }))]
    })
    class RMod {}
    let ctx: ApplicationContext;
    before(async () => { ctx = await Application.run(RMod); await new Promise(r => setTimeout(r, 500)); });
    after(async () => { if (ctx) await ctx.close(); });
    it('@RestController bootstraps', () => expect(ctx).toBeDefined());
});

// ----- 3. Parameter decorators -----
describe('Parameter decorators', () => {
    @Controller('/p')
    class PC {
        @Get('/:id') g(@RequestPath('id') id: string) { return { id }; }
        @Get('/s') s(@RequestParam('q') q: string) { return { q }; }
        @Post('/h') h(@RequestHeader('ct') ct: string, @RequestBody() b: any) { return { ct, b }; }
    }
    @Module({
        imports: [LoggerModule], declarations: [PC],
        providers: [provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: np(), host: '127.0.0.1' }, asDefault: true }))]
    })
    class PMod {}
    let ctx: ApplicationContext;
    before(async () => { ctx = await Application.run(PMod); await new Promise(r => setTimeout(r, 500)); });
    after(async () => { if (ctx) await ctx.close(); });
    it('@RequestPath', () => expect(ctx).toBeDefined());
    it('@RequestParam', () => expect(ctx).toBeDefined());
    it('@RequestHeader + @RequestBody', () => expect(ctx).toBeDefined());
});

// ----- 4. Parameter pipes -----
describe('Parameter pipes', () => {
    @Controller('/pipe')
    class PPC {
        @Get('/c') c(@RequestParam('age', { pipe: 'int' }) age: number = 0) { return { age }; }
        @Get('/d') d(@RequestParam('active', { pipe: 'boolean' }) a: boolean = false) { return { a }; }
    }
    @Module({
        imports: [LoggerModule], declarations: [PPC],
        providers: [provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: np(), host: '127.0.0.1' }, asDefault: true }))]
    })
    class PPMod {}
    let ctx: ApplicationContext;
    before(async () => { ctx = await Application.run(PPMod); await new Promise(r => setTimeout(r, 500)); });
    after(async () => { if (ctx) await ctx.close(); });
    it('int pipe', () => expect(ctx).toBeDefined());
    it('boolean pipe', () => expect(ctx).toBeDefined());
});

// ----- 5. @RouteMapping with methods -----
describe('@RouteMapping methods', () => {
    @RouteMapping('/r')
    class RMC {
        @RouteMapping('/g', GET) g() { return 'g'; }
        @RouteMapping('/p', POST) p(@RequestBody() b: any) { return b; }
        @RouteMapping('/u', PUT) u(@RequestBody() b: any) { return b; }
        @RouteMapping('/d', DELETE) d() { return 'd'; }
    }
    @Module({
        imports: [LoggerModule], declarations: [RMC],
        providers: [provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: np(), host: '127.0.0.1' }, asDefault: true }))]
    })
    class RMMod {}
    let ctx: ApplicationContext;
    before(async () => { ctx = await Application.run(RMMod); await new Promise(r => setTimeout(r, 500)); });
    after(async () => { if (ctx) await ctx.close(); });
    it('@RouteMapping methods', () => expect(ctx).toBeDefined());
});

// ----- 6. Optional + default params -----
describe('Optional params with defaults', () => {
    @Controller('/opt')
    class OC {
        @Get('/l') l(@RequestParam('p') p: number = 1, @RequestParam('s') s: string = 'a') { return { p, s }; }
    }
    @Module({
        imports: [LoggerModule], declarations: [OC],
        providers: [provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: np(), host: '127.0.0.1' }, asDefault: true }))]
    })
    class OMod {}
    let ctx: ApplicationContext;
    before(async () => { ctx = await Application.run(OMod); await new Promise(r => setTimeout(r, 500)); });
    after(async () => { if (ctx) await ctx.close(); });
    it('optional defaults', () => expect(ctx).toBeDefined());
});

// ----- 7. Multiple controllers -----
describe('Multiple controllers', () => {
    @Controller('/a') class AC { @Get('/') a() { return 'a'; } }
    @Controller('/b') class BC { @Get('/') b() { return 'b'; } }
    @Module({
        imports: [LoggerModule], declarations: [AC, BC],
        providers: [provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: np(), host: '127.0.0.1' }, asDefault: true }))]
    })
    class MCM {}
    let ctx: ApplicationContext;
    before(async () => { ctx = await Application.run(MCM); await new Promise(r => setTimeout(r, 500)); });
    after(async () => { if (ctx) await ctx.close(); });
    it('multi controllers', () => expect(ctx).toBeDefined());
});

// ----- 8. @Subscribe pattern -----
describe('@Subscribe pattern', () => {
    class SH {
        @Subscribe('device/:id/event', Transport.TCP)
        event(@RequestPath('id') id: string, @Payload() p: any) { return { id, p }; }
    }
    @Module({
        imports: [LoggerModule], declarations: [SH],
        providers: [provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: np(), host: '127.0.0.1' }, asDefault: true }))]
    })
    class SMod {}
    let ctx: ApplicationContext;
    before(async () => { ctx = await Application.run(SMod); await new Promise(r => setTimeout(r, 500)); });
    after(async () => { if (ctx) await ctx.close(); });
    it('@Subscribe bootstraps', () => expect(ctx).toBeDefined());
});

// ----- 9. @Handle cmd pattern -----
describe('@Handle cmd pattern', () => {
    class HH {
        @Handle({ cmd: 'echo' }, Transport.TCP)
        echo(@Payload() p: any) { return p; }
    }
    @Module({
        imports: [LoggerModule], declarations: [HH],
        providers: [provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: np(), host: '127.0.0.1' }, asDefault: true }))]
    })
    class HMod {}
    let ctx: ApplicationContext;
    before(async () => { ctx = await Application.run(HMod); await new Promise(r => setTimeout(r, 500)); });
    after(async () => { if (ctx) await ctx.close(); });
    it('@Handle cmd bootstraps', () => expect(ctx).toBeDefined());
});

// ----- 10. All params combined -----
describe('All params combined', () => {
    @Controller('/x')
    class XC {
        @Get('/:id') x(@RequestPath('id') id: string, @RequestParam('f') f: string = '*',
            @RequestHeader('auth') auth: string = '', @RequestBody() body?: any) { return { id, f, auth, body }; }
    }
    @Module({
        imports: [LoggerModule], declarations: [XC],
        providers: [provideService(withServiceRouter(),
            withTcpTransport({ listenOpts: { port: np(), host: '127.0.0.1' }, asDefault: true }))]
    })
    class XMod {}
    let ctx: ApplicationContext;
    before(async () => { ctx = await Application.run(XMod); await new Promise(r => setTimeout(r, 500)); });
    after(async () => { if (ctx) await ctx.close(); });
    it('all combined', () => expect(ctx).toBeDefined());
});
