import { Injectable, isString, isClass, isArray, PromiseUtil, refl } from '@tsdi/ioc';
import { Runnable, BuilderService } from '@tsdi/boot';
import { OldTestRunner } from './OldTestRunner';
import { Suite } from '../decorators';
import { TestReport } from '../reports/TestReport';
import { UnitTestContext } from '../UnitTestContext';


/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {IRunner<any>}
 */
@Injectable
export class UnitTestRunner extends Runnable<any> {

    async configureService(ctx: UnitTestContext): Promise<void> {
        this.context = ctx;
    }

    getContext(): UnitTestContext {
        return this.context as UnitTestContext;
    }

    async run(data?: any): Promise<any> {
        let context = this.getContext();
        let config = await context.getConfiguration();
        let src = config.src;
        let injector = context.injector;
        let suites: any[] = [];
        let oldRunner = injector.resolve(OldTestRunner);
        await oldRunner.configureService(context);
        let loader = injector.getLoader();
        oldRunner.registerGlobalScope();
        if (isString(src)) {
            let alltypes = await loader.loadTypes({ files: [src], basePath: this.context.baseURL });
            alltypes.forEach(tys => {
                suites = suites.concat(tys);
            })
        } else if (isClass(src)) {
            suites = [src];
        } else if (isArray(src)) {
            if (src.some(t => isClass(t))) {
                suites = src;
            } else {
                let alltypes = await loader.loadTypes({ files: src as string | string[], basePath: this.context.baseURL });
                alltypes.forEach(tys => {
                    suites = suites.concat(tys);
                })
            }
        }
        oldRunner.unregisterGlobalScope();
        await oldRunner.run();
        const builder = injector.resolve(BuilderService);
        const suiteDecor = Suite.toString();
        await PromiseUtil.step(suites.filter(v => isClass(v) && refl.getIfy(v).hasMetadata(suiteDecor)).map(s => () => builder.run({ type: s, injector: injector })));
        await injector.resolve(TestReport).report();
    }
}
