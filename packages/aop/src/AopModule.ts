import {
    Inject, IocBeforeConstructorScope, IocAfterConstructorScope, IocContainerToken, IIocContainer, Autorun,
    RuntimeMethodScope, BindProviderAction, RegisterSingletionAction, DecoratorScopes, RuntimeLifeScope,
    ConstructorArgsAction, ActionRegisterer, DesignRegisterer, RuntimeRegisterer
} from '@tsdi/ioc';
import { Aspect } from './decorators/Aspect';
import { Advisor } from './Advisor';
import { AdviceMatcher } from './AdviceMatcher';
import { Joinpoint } from './joinpoints/Joinpoint';
import { AdvisorChain } from './access/AdvisorChain';
import { AdvisorChainFactory } from './access/AdvisorChainFactory';
import { ReturningRecognizer } from './access/ReturningRecognizer';
import { SyncProceeding } from './access/SyncProceeding';
import { AsyncPromiseProceeding } from './access/AsyncPromiseProceeding';
import { ProxyMethod } from './access/ProxyMethod';
import { RegistAspectAction } from './actions/RegistAspectAction';
import { InvokeBeforeConstructorAction } from './actions/InvokeBeforeConstructorAction';
import { ExetndsInstanceAction } from './actions/ExetndsInstanceAction';
import { InvokeAfterConstructorAction } from './actions/InvokeAfterConstructorAction';
import { BindMethodPointcutAction } from './actions/BindMethodPointcutAction';
import { MatchPointcutAction } from './actions/MatchPointcutAction';



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
        // container.register(AsyncObservableProceeding);
        container.register(AdvisorChain);
        container.register(ProxyMethod);
        container.register(Advisor);
        container.register(AdviceMatcher);

        let registerer = container.getInstance(ActionRegisterer);

        registerer.register(container, RegistAspectAction);

        registerer.get(IocBeforeConstructorScope)
            .useBefore(InvokeBeforeConstructorAction);

        registerer.get(IocAfterConstructorScope)
            .use(ExetndsInstanceAction)
            .use(InvokeAfterConstructorAction);

        registerer.get(RuntimeMethodScope)
            .useBefore(BindMethodPointcutAction);

        registerer.get(RuntimeLifeScope)
            .useBefore(MatchPointcutAction, ConstructorArgsAction);

        container.getInstance(DesignRegisterer)
            .register(Aspect, DecoratorScopes.Class, BindProviderAction, RegistAspectAction);

        container.getInstance(RuntimeRegisterer)
            .register(Aspect, DecoratorScopes.Class, RegisterSingletionAction);

    }
}
