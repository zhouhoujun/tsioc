import { Injectable, isString, isClass, isArray, PromiseUtil, hasClassMetadata } from '@ts-ioc/ioc';
import { Runnable, RunnerService, ContainerPoolToken } from '@ts-ioc/boot';
import { UnitTestConfigure } from '../UnitTestConfigure';
import { OldTestRunner } from './OldTestRunner';
import { UnitTestContext } from '../UnitTestContext';
import { Suite } from '../decorators';
import { TestReport } from '../reports';


/**
 * Suite runner.
 *
 * @export
 * @class SuiteRunner
 * @implements {IRunner<any>}
 */
@Injectable
export class UnitTestRunner extends Runnable<any> {

    async run(data?: any): Promise<any> {
        console.log('run UnitTestRunner');
        let mgr = this.ctx.getConfigureManager<UnitTestConfigure>();
        let config = await mgr.getConfig();
        let src = config.src;
        let container = this.container;
        let suites: any[] = [];

        let oldRunner = container.resolve(OldTestRunner);
        let loader = container.getLoader();
        console.log(container.get(ContainerPoolToken).isRoot(container));
        oldRunner.registerGlobalScope();
        if (isString(src)) {
            let alltypes = await loader.loadTypes([{ files: [src] }]);
            alltypes.forEach(tys => {
                suites = suites.concat(tys);
            })
        } else if (isClass(src)) {
            suites = [src];
        } else if (isArray(src)) {
            if (src.some(t => isClass(t))) {
                suites = src;
            } else {
                let alltypes = await loader.loadTypes([{ files: src }]);
                alltypes.forEach(tys => {
                    suites = suites.concat(tys);
                })
            }
        }
        oldRunner.unregisterGlobalScope();
        await oldRunner.run();
        let runner = container.resolve(RunnerService);
        await PromiseUtil.step(suites.filter(v => isClass(v) && hasClassMetadata(Suite, v)).map(s => () => runner.run(UnitTestContext.create(s, { report: false }))));
        await container.resolve(TestReport).report();
    }
}
