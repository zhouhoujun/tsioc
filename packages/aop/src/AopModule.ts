import { Inject, CreateInstanceAction, DesignLifeScope } from '@ts-ioc/ioc';
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
import { RuntimeLifeScope, DecoratorRegisterer } from '@ts-ioc/ioc';
import { IocExt, ContainerToken, IContainer } from '@ts-ioc/core';


/**
 * aop ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class AopModule
 */
@IocExt('setup')
export class AopModule {

    constructor(@Inject(ContainerToken) private container: IContainer) {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let container = this.container;
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

        container.registerSingleton(BindMethodPointcutAction, () => new BindMethodPointcutAction(container));
        container.registerSingleton(ExetndsInstanceAction, () => new ExetndsInstanceAction(container));
        container.registerSingleton(InvokeBeforeConstructorAction, () => new InvokeBeforeConstructorAction(container));
        container.registerSingleton(InvokeAfterConstructorAction, () => new InvokeAfterConstructorAction(container));
        container.registerSingleton(MatchPointcutAction, () => new MatchPointcutAction(container));
        container.registerSingleton(RegistAspectAction, () => new RegistAspectAction(container));

        container.get(RuntimeLifeScope)
            .use(BindMethodPointcutAction)
            .useBefore(InvokeBeforeConstructorAction, CreateInstanceAction)
            .useAfter(InvokeAfterConstructorAction, CreateInstanceAction)
            .useBefore(MatchPointcutAction, InvokeBeforeConstructorAction)
            .useAfter(ExetndsInstanceAction, InvokeAfterConstructorAction);

        container.get(DesignLifeScope).after(RegistAspectAction);

        let decorReg = container.get(DecoratorRegisterer);
        decorReg.register(Aspect, RegistAspectAction, ExetndsInstanceAction);

    }
}
