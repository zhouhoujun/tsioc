import { GlobalRegisterer, IContainer } from '@ts-ioc/core';
import { Singleton, RuntimeLifeScope, CreateInstanceAction, DesignLifeScope } from '@ts-ioc/ioc';
import {
    BindMethodPointcutAction, InvokeBeforeConstructorAction,
    InvokeAfterConstructorAction, MatchPointcutAction, ExetndsInstanceAction, RegistAspectAction
} from './actions';

@Singleton
export class AopGlobalRegisterer extends GlobalRegisterer {
    register(container: IContainer): void {

        container.get(RuntimeLifeScope)
            .use(BindMethodPointcutAction)
            .useBefore(InvokeBeforeConstructorAction, CreateInstanceAction)
            .useAfter(InvokeAfterConstructorAction, CreateInstanceAction)
            .useBefore(MatchPointcutAction, InvokeBeforeConstructorAction)
            .useAfter(ExetndsInstanceAction, InvokeAfterConstructorAction);

        container.get(DesignLifeScope).after(RegistAspectAction);
    }
}
