import { Injectable, isString, isClass, isArray, lang, refl } from '@tsdi/ioc';
import { Runnable, AnnotationReflect, IBootContext, BUILDER } from '@tsdi/boot';
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
        const injector = ctx.injector;
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
        await oldRunner.configureService(ctx);
        const builder = injector.resolve(BUILDER);
        await lang.step(suites.filter(v => v && refl.get<AnnotationReflect>(v)?.annoType === 'suite').map(s => () => builder.statrup({ type: s, injector: injector })));
        await injector.resolve(TestReport).report();
    }
}
