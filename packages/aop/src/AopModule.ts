import {
    Inject, IocBeforeConstructorScope, IocAfterConstructorScope, IocContainerToken, IIocContainer, Autorun,
    RuntimeMethodScope, DesignDecoratorRegisterer, DecoratorType, RuntimeDecoratorRegisterer
} from '@ts-ioc/ioc';
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
 * with @Autorun('setup') decorator.
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

        container.registerSingleton(BindMethodPointcutAction, () => new BindMethodPointcutAction(container));
        container.registerSingleton(ExetndsInstanceAction, () => new ExetndsInstanceAction(container));
        container.registerSingleton(InvokeBeforeConstructorAction, () => new InvokeBeforeConstructorAction(container));
        container.registerSingleton(InvokeAfterConstructorAction, () => new InvokeAfterConstructorAction(container));
        container.registerSingleton(MatchPointcutAction, () => new MatchPointcutAction(container));
        container.registerSingleton(RegistAspectAction, () => new RegistAspectAction(container));


        container.get(IocBeforeConstructorScope)
            .use(MatchPointcutAction)
            .use(InvokeBeforeConstructorAction);

        container.get(IocAfterConstructorScope)
            .use(ExetndsInstanceAction)
            .use(InvokeAfterConstructorAction);

        container.get(RuntimeMethodScope)
            .before(BindMethodPointcutAction);

        let decorReg = container.get(DesignDecoratorRegisterer);
        decorReg.register(Aspect, DecoratorType.Class, RegistAspectAction);
        // let runtimeReg = container.get(RuntimeDecoratorRegisterer);
        // runtimeReg.register(Aspect, DecoratorType.AfterConstructor, ExetndsInstanceAction);

    }
}
