import expect = require('expect');
import * as ts from 'typescript';
import { transpileAot } from '../src/activities/AotTransform';

function loadAotOutput(output: string): Record<string, any> {
    const module = { exports: {} as Record<string, any> };
    const nodeRequire = require;
    const localRequire = (id: string): any => id === '@tsdi/service'
        ? nodeRequire('../../microservices/service/src')
        : nodeRequire(id);
    const load = new Function('exports', 'require', 'module', output);
    load(module.exports, localRequire, module);
    return module.exports;
}

describe('AOT controller route manifests', () => {
    it('emits ƿroutes for simple literal controller methods', () => {
        const output = transpileAot('aot-controller.ts', `
import { Controller, Get, Post } from '@tsdi/service';

@Controller('/api')
export class SimpleController {
    @Get('/ping')
    ping() { return 'pong'; }

    @Post()
    create() { return 'created'; }
}
`, { module: ts.ModuleKind.CommonJS });

        expect(output).toContain('SimpleController.ƿroutes = [');
        expect(output).toContain('pattern: "/ping"');
        expect(output).toContain('method: "GET"');
        expect(output).toContain('pattern: ""');
        expect(output).toContain('method: "POST"');
    });

    it('installs ƿroutes on the emitted controller class', () => {
        const output = transpileAot('aot-controller-runtime.ts', `
import { Controller, Get } from '@tsdi/service';

@Controller('/api')
export class RuntimeController {
    @Get('/ping')
    ping() { return 'pong'; }
}
`, { module: ts.ModuleKind.CommonJS });
        const exported = loadAotOutput(output);

        expect(exported.RuntimeController.ƿroutes).toEqual([
            { propertyKey: 'ping', pattern: '/ping', method: 'GET', options: {} }
        ]);
    });

    it('emits manifests for parameterized methods and leaves parameters to ClassRef metadata', () => {
        const output = transpileAot('aot-controller-complex.ts', `
import { Controller, Get, RequestParam } from '@tsdi/service';

@Controller('/api')
export class ComplexController {
    @Get('/item/:id')
    item(@RequestParam('id') id: string) { return id; }
}
`, { module: ts.ModuleKind.CommonJS });

        expect(output).toContain('ComplexController.ƿroutes =');
        expect(output).toContain('pattern: "/item/:id"');
    });

    it('installs merged class and method options on ƿroutes', () => {
        const output = transpileAot('aot-controller-options-runtime.ts', `
import { Controller, Get } from '@tsdi/service';

const Guard = () => true;
const methodOptions = { timeout: 2000 };

@Controller('/api', [Guard])
export class OptionsRuntimeController {
    @Get('/private', methodOptions)
    read() { return 'private'; }
}
`, { module: ts.ModuleKind.CommonJS });
        const exported = loadAotOutput(output);

        expect(exported.OptionsRuntimeController.ƿroutes[0].options.timeout).toBe(2000);
        expect(exported.OptionsRuntimeController.ƿroutes[0].options.guards.length).toBe(1);
    });

    it('supports call-expression route options', () => {
        const output = transpileAot('aot-controller-call-options.ts', `
import { Controller, Get } from '@tsdi/service';

function makeOptions() { return { timeout: 2000 }; }

@Controller('/api')
export class CallOptionsController {
    @Get('/call', makeOptions())
    read() { return 'call'; }
}
`, { module: ts.ModuleKind.CommonJS });
        const exported = loadAotOutput(output);

        expect(exported.CallOptionsController.ƿroutes[0].options.timeout).toBe(2000);
    });

    it('emits RouteMapping controller and method manifests', () => {
        const output = transpileAot('aot-route-mapping.ts', `
import { RouteMapping } from '@tsdi/service';
import { GET, POST } from '@tsdi/common';

@RouteMapping('/api/mapped')
export class MappedController {
    @RouteMapping('/hello', 'GET')
    hello() { return 'hello'; }

    @RouteMapping('/data', POST)
    data() { return 'data'; }
}
`, { module: ts.ModuleKind.CommonJS });
        const exported = loadAotOutput(output);

        expect(exported.MappedController.ƿroutes).toEqual([
            { propertyKey: 'hello', pattern: '/hello', method: 'GET', options: {} },
            { propertyKey: 'data', pattern: '/data', method: 'POST', options: {} }
        ]);
    });

    it('emits transport route manifests for Handle and Subscribe', () => {
        const output = transpileAot('aot-transport-routes.ts', `
import { Handle, Subscribe } from '@tsdi/service';
import { Transport } from '@tsdi/common';

export class TransportController {
    @Handle({ cmd: 'ping' }, Transport.TCP)
    ping() { return 'pong'; }

    @Subscribe('device/:id/event', Transport.TCP)
    onEvent() { return 'event'; }
}
`, { module: ts.ModuleKind.CommonJS });
        const exported = loadAotOutput(output);

        expect(exported.TransportController.ƿtransportRoutes).toEqual([
            {
                kind: 'handle',
                propertyKey: 'ping',
                pattern: { cmd: 'ping' },
                transport: 1
            },
            {
                kind: 'subscribe',
                propertyKey: 'onEvent',
                pattern: 'device/:id/event',
                transport: 1,
                subscribe: true
            }
        ]);
    });

    it('falls back when a route method has another method decorator', () => {
        const output = transpileAot('aot-controller-decorator.ts', `
import { Controller, Get } from '@tsdi/service';

function Custom() { return () => undefined; }

@Controller('/api')
export class DecoratedController {
    @Get('/x')
    @Custom()
    read() { return 'x'; }
}
`, { module: ts.ModuleKind.CommonJS });

        expect(output).not.toContain('DecoratedController.ƿroutes =');
    });

    it('emits literal route options for parameterless methods', () => {
        const output = transpileAot('aot-controller-policy.ts', `
import { Controller, Get } from '@tsdi/service';

const Guard = () => true;

@Controller('/api')
export class PolicyController {
    @Get('/private', { guards: [Guard] })
    read() { return 'private'; }
}
`, { module: ts.ModuleKind.CommonJS });

        expect(output).toContain('PolicyController.ƿroutes =');
        expect(output).toContain('guards: [Guard]');
    });

    it('supports identifier route options and class-level guards', () => {
        const output = transpileAot('aot-controller-options.ts', `
import { Controller, Get } from '@tsdi/service';

const Guard = () => true;
const options = { guards: [Guard] };

@Controller('/api', [Guard])
export class OptionsController {
    @Get('/private', options)
    read() { return 'private'; }
}
`, { module: ts.ModuleKind.CommonJS });

        expect(output).toContain('OptionsController.ƿroutes =');
        expect(output).toContain('options');
        expect(output).toContain('guards: [Guard]');
    });
});
