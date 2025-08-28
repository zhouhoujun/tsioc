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

        const platform = injector.platform();
        const context = platform.context;
        if (context.has(Advisor)) return;

        const proceeding = new ProceedingScope(platform);
        const matcher = new DefaultAdviceMatcher(platform);

        context.set(Advisor, new Advisor(matcher))
            .set(AdviceMatcher, matcher)
            .set(Proceeding, proceeding)
            .set(ProceedingScope, proceeding);

        platform.runtime.use(matchInterceptor, platform.runtime.getIndexOf(methodInterceptor));
        platform.runtime.use(pointcutInterceptor, platform.runtime.getIndexOf(ctorArgsInterceptor) + 1);

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