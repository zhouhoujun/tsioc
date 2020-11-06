import { Inject, IOC_CONTAINER, IIocContainer, runtimes, RuntimeLifeScope, ActionInjector, IocExt } from '@tsdi/ioc';
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

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(IOC_CONTAINER) container: IIocContainer) {

        const actInjector = container.getValue(ActionInjector);

        actInjector
            .setValue(ADVISOR, new Advisor(container.getProxy()), Advisor)
            .setValue(ADVICE_MATCHER, new AdviceMatcher(container.getProxy()), AdviceMatcher);

        actInjector.regAction(ProceedingScope);

        actInjector.getInstance(runtimes.BeforeCtorScope)
            .useBefore(BeforeCtorAdviceAction);

        actInjector.getInstance(runtimes.AfterCtorScope)
            // .use(ExetndsInstanceAction)
            .use(AfterCtorAdviceAction);

        actInjector.getInstance(runtimes.RuntimeMthScope)
            .useBefore(BindMthPointcutAction);

        actInjector.getInstance(RuntimeLifeScope)
            .useBefore(MatchPointcutAction, runtimes.CtorArgsAction);


    }
}
