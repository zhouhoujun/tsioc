import { Inject, runtimes, RuntimeLifeScope, IocExt, Injector, CONTAINER } from '@tsdi/ioc';
import { BeforeCtorAdviceAction, AfterCtorAdviceAction, BindMthPointcutAction, MatchPointcutAction } from './actions/aop';
import { Advisor } from './Advisor';
import { AdviceMatcher } from './AdviceMatcher';
import { ProceedingScope } from './actions/proceed';
import { ADVISOR, ADVICE_MATCHER } from './metadata/tk';



/**
 * aop ext for ioc. auto run setup after registered.
 * @export
 * @class AopModule
 */
@IocExt()
export class AopModule {

    constructor() { }

    /**
     * register aop for container.
     */
    setup(@Inject(CONTAINER) injector: Injector) {

        const platform = injector.platform();

        platform.setActionValue(ADVISOR, new Advisor(injector), Advisor)
            .setActionValue(ADVICE_MATCHER, new AdviceMatcher(injector), AdviceMatcher);

        platform.registerAction(ProceedingScope);

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
