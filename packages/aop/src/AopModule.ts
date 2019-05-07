import {
    Inject, IocBeforeConstructorScope, IocAfterConstructorScope, IocContainerToken, IIocContainer, Autorun,
    RuntimeMethodScope, DesignDecoratorRegisterer, DesignAnnoationScope, BindProviderAction,
    RuntimeDecoratorRegisterer, RegisterSingletionAction, DecoratorScopes, RuntimeLifeScope, ConstructorArgsAction, ActionRegisterer
} from '@tsdi/ioc';
import { Aspect } from './decorators/Aspect';
import { Advisor } from './Advisor';
import {
    BindMethodPointcutAction, RegistAspectAction, ExetndsInstanceAction,
    InvokeBeforeConstructorAction, InvokeAfterConstructorAction, MatchPointcutAction
} from './actions';
import { AdviceMatcher } from './AdviceMatcher';
import { Joinpoint } from './joinpoints';
import {
    ProxyMethod, AdvisorChainFactory, AdvisorChain, SyncProceeding,
    AsyncObservableProceeding, AsyncPromiseProceeding, ReturningRecognizer
} from './access';


/**
 * aop ext for ioc. auto run setup after registered.
 * with `@Autorun('setup')` decorator.
 * @export
 * @class AopModule
 */
@Autorun('setup')
export class AopModule {

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(IocContainerToken) container: IIocContainer) {

        container.register(Joinpoint);
        container.register(AdvisorChainFactory);
        container.register(ReturningRecognizer);
        container.register(SyncProceeding);
        container.register(AsyncPromiseProceeding);
        container.register(AsyncObservableProceeding);
        container.register(AdvisorChain);
        container.register(ProxyMethod);
        container.register(Advisor);
        container.register(AdviceMatcher);

        container.get(ActionRegisterer)
            .register(container, RegistAspectAction);

        container.get(IocBeforeConstructorScope)
            .useBefore(InvokeBeforeConstructorAction);

        container.get(IocAfterConstructorScope)
            .use(ExetndsInstanceAction)
            .use(InvokeAfterConstructorAction);

        container.get(RuntimeMethodScope)
            .useBefore(BindMethodPointcutAction);

        // container.get(DesignAnnoationScope)
        //     .use(MatchPointcutAction);
        container.get(RuntimeLifeScope)
            .useBefore(MatchPointcutAction, ConstructorArgsAction);

        container.get(DesignDecoratorRegisterer)
            .register(Aspect, DecoratorScopes.Class, BindProviderAction, RegistAspectAction);

        container.get(RuntimeDecoratorRegisterer)
            .register(Aspect, DecoratorScopes.Class, RegisterSingletionAction);

    }
}
