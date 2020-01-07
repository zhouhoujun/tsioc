import { Injectable, isString, isClass, isArray, PromiseUtil } from '@tsdi/ioc';
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
export class UnitTestRunner extends Runnable<any, UnitTestContext> {

    async run(data?: any): Promise<any> {
        let mgr = this.context.getConfigureManager();
        let config = await mgr.getConfig();
        let src = config.src;
        let injector = this.getInjector();
        let suites: any[] = [];

        let oldRunner = injector.resolve(OldTestRunner);
        let loader = this.context.getContainer().getLoader();
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
                let alltypes = await loader.loadTypes({ files: src, basePath: this.context.baseURL });
                alltypes.forEach(tys => {
                    suites = suites.concat(tys);
                })
            }
        }
        oldRunner.unregisterGlobalScope();
        await oldRunner.run();
        let builder = injector.resolve(BuilderService);
        let reflects = this.context.reflects;
        await PromiseUtil.step(suites.filter(v => isClass(v) && reflects.hasMetadata(Suite, v)).map(s => () => builder.run({ type: s, injector: injector })));
        await injector.resolve(TestReport).report();
    }
}
