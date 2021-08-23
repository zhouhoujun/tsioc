import { Injectable, isString, isClass, isArray, lang, refl, Injector } from '@tsdi/ioc';
import { AnnotationReflect, ApplicationContext, Runnable } from '@tsdi/boot';
import { OldTestRunner } from './OldTestRunner';
import { TestReport } from '../reports/TestReport';
import { UnitTestConfigure } from '../UnitTestConfigure';


/**
 * Suite runner.
 */
@Injectable()
export class UnitTestRunner extends Runnable {

    constructor(private injector: Injector) {
        super()
    }

    override async run(ctx: ApplicationContext): Promise<void> {
        const injector = this.injector;
        const config = ctx.getConfiguration() as UnitTestConfigure;
        const src = config.src;
        let suites: any[] = [];
        const oldRunner = injector.resolve(OldTestRunner);
        const loader = injector.getLoader();
        oldRunner.registerGlobalScope();
        if (isString(src)) {
            suites = await loader.loadType({ files: [src], basePath: ctx.baseURL });
        } else if (isClass(src)) {
            suites = [src];
        } else if (isArray(src)) {
            if (src.some(t => isClass(t))) {
                suites = src;
            } else {
                suites = await loader.loadType({ files: src as string | string[], basePath: ctx.baseURL });
            }
        }
        oldRunner.unregisterGlobalScope();
        await oldRunner.run();
        await lang.step(suites.filter(v => v && refl.get<AnnotationReflect>(v)?.annoType === 'suite').map(s => () => ctx.bootstrap(s)));
        await injector.resolve(TestReport).report();
    }
}
