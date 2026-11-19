import expect = require('expect');
import * as ts from 'typescript';
import { Suite, Test } from '@tsdi/unit';
import { transpileAot } from '../src/activities/AotTransform';

/**
 * CommonJS program emit cannot link a synthetic import alias to the generated
 * `__aotDeco(...)` call. The transformer must therefore bind the helper with a
 * real `require`, or every AOT-built Node/browser bundle fails at class
 * definition time with `ReferenceError: __aotDeco is not defined`.
 */
@Suite('AOT CommonJS helper binding')
export class AotCommonJsRuntimeTest {
    @Test('emitted CommonJS defines the decorator helper before use')
    decoratorHelperIsDefined() {
        const source = `
import { Injectable, Inject, Injector } from '@tsdi/ioc';
@Injectable()
export class DemoService {
    constructor(@Inject('DEMO') private readonly value: string, private readonly injector: Injector) {}
}
`;
        const output = transpileAot('demo.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(output).toContain('const __aotDeco = require("@tsdi/ioc").applyPrecompiledDecorators;');
        expect(output).toContain('__aotDeco(DemoService,');
        // Imported classes used by design:paramtypes must be qualified by a real
        // module binding; a bare identifier is undefined at runtime.
        expect(output).toMatch(/Reflect\.metadata\("design:paramtypes", \[String, __tsdi_ns_\d+\.Injector\]\)/);
    }

    @Test('emitted CommonJS module loads without a ReferenceError')
    decoratorHelperRunsAtRuntime() {
        const source = `
import { Injectable, Injector } from '@tsdi/ioc';
@Injectable()
export class DemoService {
    constructor(private readonly injector: Injector) {}
}
`;
        const output = transpileAot('demo.ts', source, { module: ts.ModuleKind.CommonJS });
        expect(output).toContain('applyPrecompiledType');
        expect(output).toContain('__aotType(DemoService,');
        const module = { exports: {} as Record<string, any> };
        const nodeRequire = require;
        const localRequire = (id: string): any => id === '@tsdi/ioc'
            ? nodeRequire('../../ioc/src')
            : nodeRequire(id);
        const load = new Function('exports', 'require', 'module', output);
        expect(() => load(module.exports, localRequire, module)).not.toThrow();
        expect(typeof module.exports.DemoService).toEqual('function');

        // Guard the regression itself: without the binding this is exactly the
        // browser/runtime failure users saw (`__aotType is not defined`).
        const broken = output.replace(
            /const __aotType = require\(["']@tsdi\/ioc["']\)\.applyPrecompiledType;\n/,
            ''
        );
        const brokenModule = { exports: {} as Record<string, any> };
        const loadBroken = new Function('exports', 'require', 'module', broken);
        expect(() => loadBroken(brokenModule.exports, localRequire, brokenModule)).toThrow(/__aotType is not defined/);
    }
}
