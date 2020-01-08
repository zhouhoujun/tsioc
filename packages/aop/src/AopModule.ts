import {
    Inject, IocBeforeConstructorScope, IocAfterConstructorScope, IocContainerToken, IIocContainer,
    RuntimeMethodScope, BindProviderAction, RegisterSingletionAction, DecoratorScopes, RuntimeLifeScope,
    ConstructorArgsAction, ActionInjector, DesignRegisterer, RuntimeRegisterer, IocExt
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

        container.inject(
            Joinpoint, AdvisorChainFactory, ReturningRecognizer,
            SyncProceeding, AsyncPromiseProceeding, AdvisorChain,
            ProxyMethod, Advisor, AdviceMatcher);

        let actInjector = container.getInstance(ActionInjector);

        // actInjector.regAction(RegistAspectAction);

        actInjector.getInstance(IocBeforeConstructorScope)
            .useBefore(InvokeBeforeConstructorAction);

        actInjector.getInstance(IocAfterConstructorScope)
            .use(ExetndsInstanceAction)
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
