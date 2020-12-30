import {
    Inject, BeforeCtorScope, AfterCtorScope, IContainer,
    RuntimeMthScope, TypeProviderAction, RegSingletionAction, RuntimeLifeScope,
    CtorArgsAction, DesignRegisterer, RuntimeRegisterer, IocExt, TypeReflectsToken, CONTAINER
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
    setup(@Inject(CONTAINER) container: IContainer) {

        const actInjector = container.provider;
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
