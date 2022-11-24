import { Injectable, isString, isClass, isArray, lang, refl } from '@tsdi/ioc';
import { ApplicationContext, Runner } from '@tsdi/core';
import { OldTestRunner } from './OldTestRunner';
import { DefaultTestReport } from '../reports/TestReport';
import { SuiteReflect } from '../metadata/meta';
import { UNITTESTCONFIGURE } from '../configure';


/**
 * Suite runner.
 */
@Injectable()
export class UnitTestRunner {

    @Runner()
    async run(ctx: ApplicationContext): Promise<void> {
        const injector = ctx.injector;
        const config = ctx.resolve(UNITTESTCONFIGURE);
        const src = config.src;
        let suites: any[] = [];
        const oldRunner = ctx.resolve(OldTestRunner);
        const loader = injector.getLoader();
        oldRunner.registerGlobalScope();
        if (isString(src)) {
            suites = await loader.loadType({ files: [src], basePath: ctx.baseURL })
        } else if (isClass(src)) {
            suites = [src]
        } else if (isArray(src)) {
            if (src.some(t => isClass(t))) {
                suites = src
            } else {
                suites = await loader.loadType({ files: src as string | string[], basePath: ctx.baseURL })
            }
        }
        oldRunner.unregisterGlobalScope();
        await oldRunner.run();
        await lang.step(suites.filter(v => v && refl.get<SuiteReflect>(v)?.suite).map(s => () => ctx.bootstrap(s)));
        await ctx.resolve(DefaultTestReport).report()
    }
}
