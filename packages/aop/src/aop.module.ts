import { Inject, Injector, Autorun, Module, getRuntimeClassScope, getRuntimeBeforeCtorScope, getRuntimeAfterCtorScope, getRuntimeMethodScope } from '@tsdi/ioc';
import { beforeCtorAdvice, afterCtorAdvice, bindMthPointcut, matchPointcut } from './actions/aop';
import { Advisor } from './Advisor';
import { DefaultAdviceMatcher } from './DefaultAdviceMatcher';
import { CtorAdvicesScope, MethodAdvicesScope, ProceedingScope } from './actions/proceed';
import { Proceeding } from './Proceeding';
import { AdviceMatcher } from './AdviceMatcher';



@Autorun({
    providedIn: 'root',
    method: 'setup'
})
export class AopProvider {

    /**
     * register aop for container.
     */
    setup(@Inject() injector: Injector) {

        const platform = injector.platform();
        const context = platform.context;
        if (context.has(Advisor)) return;

        const ctorAdvicesScope = new CtorAdvicesScope();
        const methodAdvicesScope = new MethodAdvicesScope();

        context.set(CtorAdvicesScope, ctorAdvicesScope)
            .set(MethodAdvicesScope, methodAdvicesScope);

        const proceeding = new ProceedingScope(platform, [ctorAdvicesScope, methodAdvicesScope]);

        context.set(Advisor, new Advisor(platform))
            .set(AdviceMatcher, new DefaultAdviceMatcher(platform))
            .set(Proceeding, proceeding)
            .set(ProceedingScope, proceeding);


        getRuntimeBeforeCtorScope(platform).use(beforeCtorAdvice, 0);

        getRuntimeAfterCtorScope(platform).use(afterCtorAdvice);

        getRuntimeMethodScope(platform).use(bindMthPointcut, 0);

        platform.runtime.use(matchPointcut, 1);

        // platform.registerAction(ProceedingLifeScope);
        // platform.setActionValue(Proceeding, platform.getAction(ProceedingLifeScope));

        // platform.getAction(runtimes.BeforeCtorScope)
        //     .useBefore(BeforeCtorAdviceAction);

        // platform.getAction(runtimes.AfterCtorScope)
        //     .use(AfterCtorAdviceAction);

        // platform.getAction(runtimes.RuntimeMthScope)
        //     .useBefore(BindMthPointcutAction);

        // platform.getAction(RuntimeLifeScope)
        //     .useBefore(MatchPointcutAction, runtimes.CtorArgsAction);

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