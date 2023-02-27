import { Inject, runtimes, RuntimeLifeScope, Injector, Autorun, Injectable, Module } from '@tsdi/ioc';
import { BeforeCtorAdviceAction, AfterCtorAdviceAction, BindMthPointcutAction, MatchPointcutAction } from './actions/aop';
import { Advisor } from './Advisor';
import { DefaultAdviceMatcher } from './DefaultAdviceMatcher';
import { ProceedingScope } from './actions/proceed';
import { Proceeding } from './Proceeding';
import { AdviceMatcher } from './AdviceMatcher';


@Injectable({
    providedIn: 'root',
    singleton: true
})
export class AopProvider {

    /**
     * register aop for container.
     */
    @Autorun()
    setup(@Inject() injector: Injector) {

        const platform = injector.platform();
        if (platform.hasAction(Advisor)) return;

        platform.setActionValue(Advisor, new Advisor(platform), Advisor)
            .setActionValue(AdviceMatcher, new DefaultAdviceMatcher(platform), DefaultAdviceMatcher);

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
