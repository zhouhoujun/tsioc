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
        const config = ctx.getConfiguration() as UnitTestConfigure;
        const src = config.src;
        const root = ctx.root;
        let suites: any[] = [];
        const oldRunner = root.resolve(OldTestRunner);
        const loader = root.getLoader();
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
        const builder = root.resolve(BuilderService);
        await lang.step(suites.filter(v => v && refl.get<AnnotationReflect>(v)?.annoType === 'suite').map(s => () => builder.statrup({ type: s, injector: root })));
        await root.resolve(TestReport).report();
    }
}
