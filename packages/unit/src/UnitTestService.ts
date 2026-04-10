import { Injectable, isString, isType, isArray, Type, step, getDef } from '@tsdi/ioc';
import { ApplicationContext, ModuleLoader, Runner } from '@tsdi/core';
import { OldTestRunner } from './runner/OldTestRunner';
import { DefaultTestReport } from './reports/TestReport';
import { SuiteDef } from './metadata';
import { UNITTESTCONFIGURE } from './configure';



/**
 * Suite runner.
 */
@Injectable()
export class UnitTestService {

    @Runner()
    async run(ctx: ApplicationContext): Promise<void> {

        const config = ctx.resolve(UNITTESTCONFIGURE);
        const src = config.src;
        let suites: any[] = [];
        const oldRunner = ctx.resolve(OldTestRunner);
        const loader = ctx.get(ModuleLoader);
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

        const { unitSuites, e2eSuites } = suites.reduce((prev: { unitSuites: Type[], e2eSuites: Type[] }, cur) => {
            if (cur) {
                const sdef = getDef<SuiteDef>(cur);
                if (sdef.suite) {
                    if (sdef.e2e) {
                        prev.e2eSuites.push(cur);
                    } else {
                        prev.unitSuites.push(cur);
                    }
                }
            }
            return prev;
        }, { unitSuites: [] as Type[], e2eSuites: [] as Type[] });


        if (unitSuites.length) await step(unitSuites.map(s => () => ctx.bootstrap(s)));
        if (e2eSuites.length) await step(e2eSuites.map(s => () => ctx.bootstrap(s)));

        await ctx.resolve(DefaultTestReport).report();
    }
}
