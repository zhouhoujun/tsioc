import { Inject, runtimes, RuntimeLifeScope, Injector, Autorun, Module } from '@tsdi/ioc';
import { BeforeCtorAdviceAction, AfterCtorAdviceAction, BindMthPointcutAction, MatchPointcutAction } from './actions/aop';
import { Advisor } from './Advisor';
import { DefaultAdviceMatcher } from './DefaultAdviceMatcher';
import { ProceedingScope } from './actions/proceed';
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
        if (platform.context.has(Advisor)) return;

        platform.context.set(Advisor, new Advisor(platform))
            .set(AdviceMatcher, new DefaultAdviceMatcher(platform));

        platform.registerAction(ProceedingScope);
        platform.setActionValue(Proceeding, platform.getAction(ProceedingScope));

        platform.getAction(runtimes.BeforeCtorScope)
            .useBefore(BeforeCtorAdviceAction);

        platform.getAction(runtimes.AfterCtorScope)
            .use(AfterCtorAdviceAction);

        platform.getAction(runtimes.RuntimeMthScope)
            .useBefore(BindMthPointcutAction);

        platform.getAction(RuntimeLifeScope)
            .useBefore(MatchPointcutAction, runtimes.CtorArgsAction);

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
