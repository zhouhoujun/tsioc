import {
    Inject, BeforeCtorScope, AfterCtorScope, IocContainerToken, IIocContainer,
    RuntimeMthScope, TypeProviderAction, RegSingletionAction, RuntimeLifeScope,
    CtorArgsAction, ActionInjector, DesignRegisterer, RuntimeRegisterer, IocExt, TypeReflectsToken
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
        const reflects = container.getValue(TypeReflectsToken);

        actInjector
            .setValue(AdvisorToken, new Advisor(reflects), Advisor)
            .setValue(AdviceMatcherToken, new AdviceMatcher(reflects), AdviceMatcher);

        actInjector.regAction(ProceedingScope);

        actInjector.getInstance(BeforeCtorScope)
            .useBefore(BeforeCtorAdviceAction);

        actInjector.getInstance(AfterCtorScope)
            // .use(ExetndsInstanceAction)
            .use(AfterCtorAdviceAction);

        actInjector.getInstance(RuntimeMthScope)
            .useBefore(BindMthPointcutAction);

        actInjector.getInstance(RuntimeLifeScope)
            .useBefore(MatchPointcutAction, CtorArgsAction);

        actInjector.getInstance(DesignRegisterer)
            .register(Aspect, 'Class', TypeProviderAction, RegistAspectAction);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Aspect, 'Class', RegSingletionAction);

    }
}
