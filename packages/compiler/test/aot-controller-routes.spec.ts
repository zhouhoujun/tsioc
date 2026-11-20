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

    it('falls back when a route method has parameter or policy decorators', () => {
        const output = transpileAot('aot-controller-complex.ts', `
import { Controller, Get, RequestParam } from '@tsdi/service';

@Controller('/api')
export class ComplexController {
    @Get('/item/:id')
    item(@RequestParam('id') id: string) { return id; }
}
`, { module: ts.ModuleKind.CommonJS });

        expect(output).not.toContain('Controller.ƿroutes =');
    });

    it('falls back when a route decorator has runtime policy arguments', () => {
        const output = transpileAot('aot-controller-policy.ts', `
import { Controller, Get } from '@tsdi/service';

@Controller('/api')
export class PolicyController {
    @Get('/private', { guards: [] })
    read() { return 'private'; }
}
`, { module: ts.ModuleKind.CommonJS });

        expect(output).not.toContain('Controller.ƿroutes =');
    });
});
