import { Injectable, isString, isType, isArray, lang, refl } from '@tsdi/ioc';
import { ApplicationContext, ModuleLoader, Runner } from '@tsdi/core';
import { OldTestRunner } from './OldTestRunner';
import { DefaultTestReport } from '../reports/TestReport';
import { SuiteDef } from '../metadata';
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
        const loader = injector.get(ModuleLoader);
        oldRunner.registerGlobalScope();
        if (isString(src)) {
            suites = await loader.loadType({ files: [src], basePath: ctx.baseURL })
        } else if (isType(src)) {
            suites = [src]
        } else if (isArray(src)) {
            if (src.some(t => isType(t))) {
                suites = src
            } else {
                suites = await loader.loadType({ files: src as string | string[], basePath: ctx.baseURL })
            }
        }
        oldRunner.unregisterGlobalScope();
        await oldRunner.run();
        await lang.step(suites.filter(v => v && refl.getDef<SuiteDef>(v)?.suite).map(s => () => ctx.bootstrap(s)));
        await ctx.resolve(DefaultTestReport).report()
    }
}
