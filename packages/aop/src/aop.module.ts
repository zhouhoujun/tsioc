import { Inject, Injector, Autorun, Module, ctorArgsInterceptor, methodInterceptor } from '@tsdi/ioc';
import { matchInterceptor, pointcutInterceptor } from './impl/aop';
import { Advisor } from './Advisor';
import { DefaultAdviceMatcher } from './impl/matcher';
import { ProceedingScope } from './impl/proceed';
import { Proceeding } from './Proceeding';
import { AdviceMatcher } from './AdviceMatcher';



@Autorun({
    providedIn: 'root',
    propertyKey: 'setup'
})
export class AopProvider {

    /**
     * register aop for container.
     */
    setup(@Inject() injector: Injector) {

        const runtime = injector.getRuntime();
        if (runtime.has(Advisor)) return;

        const proceeding = new ProceedingScope(runtime);
        const matcher = new DefaultAdviceMatcher(runtime);

        runtime.set(Advisor, new Advisor(matcher))
            .set(AdviceMatcher, matcher)
            .set(Proceeding, proceeding)
            .set(ProceedingScope, proceeding);

        const handler = runtime.getInstanceHandler();

        handler.use(matchInterceptor, handler.getIndexOf(methodInterceptor));
        handler.use(pointcutInterceptor, handler.getIndexOf(ctorArgsInterceptor) + 1);

    }
}

/**
 * aop ext for ioc. auto run setup after registered.
 * @export
 * @class AopModule
 */
@Module({
    providers: [
        AopProvider
    ]
})
export class AopModule {

}

export function provideAop() {
    return {
        providers: [
            AopProvider
        ]
    };
}