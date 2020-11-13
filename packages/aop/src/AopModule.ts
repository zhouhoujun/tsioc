import { Inject, IOC_CONTAINER, IIocContainer, runtimes, RuntimeLifeScope, IocExt } from '@tsdi/ioc';
import { BeforeCtorAdviceAction, AfterCtorAdviceAction, BindMthPointcutAction, MatchPointcutAction } from './actions/aop';
import { Advisor } from './Advisor';
import { AdviceMatcher } from './AdviceMatcher';
import { ProceedingScope } from './actions/proceed';
import { ADVISOR, ADVICE_MATCHER } from './tk';



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
     *
     * @memberof AopModule
     */
    setup(@Inject(IOC_CONTAINER) container: IIocContainer) {

        const prdr = container.provider;

        prdr.setValue(ADVISOR, new Advisor(container), Advisor)
            .setValue(ADVICE_MATCHER, new AdviceMatcher(container), AdviceMatcher);

        prdr.regAction(ProceedingScope);

        prdr.getInstance(runtimes.BeforeCtorScope)
            .useBefore(BeforeCtorAdviceAction);

        prdr.getInstance(runtimes.AfterCtorScope)
            .use(AfterCtorAdviceAction);

        prdr.getInstance(runtimes.RuntimeMthScope)
            .useBefore(BindMthPointcutAction);

        prdr.getInstance(RuntimeLifeScope)
            .useBefore(MatchPointcutAction, runtimes.CtorArgsAction);

    }
}
