import expect = require('expect');
import * as ts from 'typescript';
import * as ioc from '@tsdi/ioc';
import * as aop from '@tsdi/aop';
import { createAotTransformer } from '../src/activities/AotTransformer';

function compileRuntime(source: string): any {
    const file = ts.createSourceFile('precompiled-fixture.ts', source, ts.ScriptTarget.ES2020, true);
    const result = ts.transform(file, [createAotTransformer({ designMetadata: true })]);
    const printed = ts.createPrinter().printFile(result.transformed[0] as ts.SourceFile);
    result.dispose();
    const code = ts.transpileModule(printed, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: false,
            emitDecoratorMetadata: false
        }
    }).outputText;
    const mod: any = { exports: {} };
    new Function('require', 'exports', 'module', code)(
        (specifier: string) => {
            if (specifier === '@tsdi/ioc') {
                return ioc;
            }
            if (specifier === '@tsdi/aop') {
                return aop;
            }
            return require(specifier);
        },
        mod.exports,
        mod
    );
    return mod.exports;
}

describe('precompiled decorator runtime', () => {
    afterEach(() => {
        aop.clearPrecompiledAspects?.();
        delete (globalThis as any).precompiledAdviceCalls;
    });

    it('boots IoC and executes a precompiled AOP advice without decorator syntax', () => {
        delete (globalThis as any).precompiledAdviceCalls;
        const exported = compileRuntime(`
import { Injectable, InjectUtil, createInjector } from '@tsdi/ioc';
import { Aspect, Before, JoinPoint, AopModule } from '@tsdi/aop';

@Injectable()
export class PrecompiledService {
    execute() { return 'done'; }
}

@Aspect({ static: true, within: PrecompiledService })
export class PrecompiledAspect {
    @Before('execution(PrecompiledService.execute)')
    before(joinPoint: JoinPoint) {
        (globalThis as any).precompiledAdviceCalls =
            ((globalThis as any).precompiledAdviceCalls || 0) + 1;
    }
}

export function bootstrap() {
    const container = createInjector();
    InjectUtil.use(container, AopModule, PrecompiledAspect, PrecompiledService);
    const service = container.get(PrecompiledService) as PrecompiledService;
    return service.execute();
}
`);
        expect(exported.bootstrap()).toBe('done');
        expect((globalThis as any).precompiledAdviceCalls).toBe(1);
        delete (globalThis as any).precompiledAdviceCalls;
    });
});
