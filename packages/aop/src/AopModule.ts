import {
    Inject, IocBeforeConstructorScope, IocAfterConstructorScope, IocContainerToken, IIocContainer,
    RuntimeMethodScope, BindProviderAction, RegisterSingletionAction, DecoratorScopes, RuntimeLifeScope,
    ConstructorArgsAction, ActionInjector, DesignRegisterer, RuntimeRegisterer, IocExt, TypeReflectsToken
} from '@tsdi/ioc';
import { Aspect } from './decorators/Aspect';
import { Advisor } from './Advisor';
import { AdviceMatcher } from './AdviceMatcher';
import { RegistAspectAction } from './actions/RegistAspectAction';
import { InvokeBeforeConstructorAction } from './actions/InvokeBeforeConstructorAction';
import { InvokeAfterConstructorAction } from './actions/InvokeAfterConstructorAction';
import { BindMethodPointcutAction } from './actions/BindMethodPointcutAction';
import { MatchPointcutAction } from './actions/MatchPointcutAction';
import { ProceedingScope } from './proceeding/ProceedingScope';
import { AdvisorToken } from './IAdvisor';
import { AdviceMatcherToken } from './IAdviceMatcher';



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

        const actInjector = container.getInstance(ActionInjector);
        const reflects = container.getInstance(TypeReflectsToken);

        actInjector
            .setValue(AdvisorToken, new Advisor(reflects), Advisor)
            .setValue(AdviceMatcherToken, new AdviceMatcher(reflects), AdviceMatcher);

        actInjector.regAction(ProceedingScope);

        actInjector.getInstance(IocBeforeConstructorScope)
            .useBefore(InvokeBeforeConstructorAction);

        actInjector.getInstance(IocAfterConstructorScope)
            // .use(ExetndsInstanceAction)
            .use(InvokeAfterConstructorAction);

        actInjector.getInstance(RuntimeMethodScope)
            .useBefore(BindMethodPointcutAction);

        actInjector.getInstance(RuntimeLifeScope)
            .useBefore(MatchPointcutAction, ConstructorArgsAction);

        actInjector.getInstance(DesignRegisterer)
            .register(Aspect, DecoratorScopes.Class, BindProviderAction, RegistAspectAction);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Aspect, DecoratorScopes.Class, RegisterSingletionAction);

    }
}
