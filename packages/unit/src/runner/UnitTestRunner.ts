import { Injectable, isString, isClass, isArray, lang, refl } from '@tsdi/ioc';
import { Runnable, BuilderService, AnnotationReflect, IBootContext } from '@tsdi/boot';
import { OldTestRunner } from './OldTestRunner';
import { TestReport } from '../reports/TestReport';
import { UnitTestConfigure } from '../UnitTestConfigure';


/**
 * Suite runner.
 */
@Injectable()
export class UnitTestRunner extends Runnable {

    async configureService(context: IBootContext): Promise<void> {
        const ctx = context;
        let config = ctx.getConfiguration() as UnitTestConfigure;
        let src = config.src;
        let injector = ctx.root;
        let suites: any[] = [];
        let oldRunner = injector.resolve(OldTestRunner);
        let loader = injector.getLoader();
        oldRunner.registerGlobalScope();
        if (isString(src)) {
            let alltypes = await loader.loadTypes({ files: [src], basePath: ctx.baseURL });
            alltypes.forEach(tys => {
                suites = suites.concat(tys);
            })
        } else if (isClass(src)) {
            suites = [src];
        } else if (isArray(src)) {
            if (src.some(t => isClass(t))) {
                suites = src;
            } else {
                let alltypes = await loader.loadTypes({ files: src as string | string[], basePath: ctx.baseURL });
                alltypes.forEach(tys => {
                    suites = suites.concat(tys);
                })
            }
        }
        oldRunner.unregisterGlobalScope();
        await oldRunner.configureService(ctx);
        const builder = injector.resolve(BuilderService);
        await lang.step(suites.filter(v => v && refl.get<AnnotationReflect>(v)?.annoType === 'suite').map(s => () => builder.statrup({ type: s, injector: injector })));
        await injector.resolve(TestReport).report();
    }
}
