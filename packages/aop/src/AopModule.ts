import {
    Inject, IocContainerToken, IIocContainer, runtimes,
    RuntimeLifeScope, ActionInjector, DesignRegisterer, RuntimeRegisterer, IocExt
} from '@tsdi/ioc';
import { Aspect } from './decorators';
import { Advisor } from './Advisor';
import { AdviceMatcher } from './AdviceMatcher';
import {
    RegistAspectAction, BeforeCtorAdviceAction, AfterCtorAdviceAction,
    BindMthPointcutAction, MatchPointcutAction
} from './actions/aop';
import { ProceedingScope } from './actions/proceed';
import { AdvisorToken, AdviceMatcherToken } from './tk';



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
    setup(@Inject(IocContainerToken) container: IIocContainer) {

        const actInjector = container.getValue(ActionInjector);

        actInjector
            .setValue(AdvisorToken, new Advisor(container.getProxy()), Advisor)
            .setValue(AdviceMatcherToken, new AdviceMatcher(container.getProxy()), AdviceMatcher);

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

        actInjector.getInstance(DesignRegisterer)
            .register(Aspect, 'Class', RegistAspectAction);


    }
}
