import { ParamProviders } from '../providers';
import { Type } from '../types';
import {
    IocGetCacheAction, RuntimeMethodScope, RuntimeActionContext,
    GetSingletionAction, ContainerCheckerAction, CreateInstanceAction, ConstructorArgsAction,
    IocBeforeConstructorScope, IocAfterConstructorScope, InstanceCheckAction,
    RuntimeAnnoationScope, RuntimePropertyScope, InitReflectAction, RuntimeParamScope,
    RuntimeDecoratorAction
} from '../actions';
import { IIocContainer } from '../IIocContainer';
import { IParameter } from '../IParameter';
import { RuntimeDecoratorRegisterer } from './DecoratorRegisterer';
import { RegisterLifeScope } from './RegisterLifeScope';

/**
 * runtime life scope.
 *
 * @export
 * @class RuntimeLifeScope
 * @extends {LifeScope}
 */
export class RuntimeLifeScope extends RegisterLifeScope<RuntimeActionContext> {

    getParamProviders(container: IIocContainer, type: Type<any>, propertyKey: string, target?: any): ParamProviders[] {
        let tgRefl = container.getTypeReflects().get(type);
        if (tgRefl && tgRefl.methodParamProviders.has(propertyKey)) {
            return tgRefl.methodParamProviders.get(propertyKey) || [];
        }
        return [];
    }

    /**
     * get constructor parameters metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getConstructorParameters<T>(container: IIocContainer, type: Type<T>): IParameter[] {
        return this.getParameters(container, type);
    }

    /**
     * get method params metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @param {T} instance
     * @param {(string | symbol)} propertyKey
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getMethodParameters<T>(container: IIocContainer, type: Type<T>, instance: T, propertyKey: string): IParameter[] {
        return this.getParameters(container, type, instance, propertyKey);
    }

    setup(container: IIocContainer) {
        container.registerSingleton(RuntimeDecoratorRegisterer, () => new RuntimeDecoratorRegisterer());

        if (!container.has(InitReflectAction)) {
            container.registerSingleton(InitReflectAction, () => new InitReflectAction(container));
        }

        container.registerSingleton(ConstructorArgsAction, () => new ConstructorArgsAction(container));
        container.registerSingleton(ContainerCheckerAction, () => new ContainerCheckerAction(container));
        container.registerSingleton(CreateInstanceAction, () => new CreateInstanceAction(container));
        container.registerSingleton(GetSingletionAction, () => new GetSingletionAction(container));
        container.registerSingleton(InstanceCheckAction, () => new InstanceCheckAction(container));
        container.registerSingleton(IocGetCacheAction, () => new IocGetCacheAction(container));

        container.registerSingleton(IocBeforeConstructorScope, () => new IocBeforeConstructorScope(container));
        container.registerSingleton(IocAfterConstructorScope, () => new IocAfterConstructorScope(container));

        container.registerSingleton(RuntimeDecoratorAction, () => new RuntimeDecoratorAction(container));
        container.registerSingleton(RuntimeAnnoationScope, () => new RuntimeAnnoationScope(container));
        container.registerSingleton(RuntimePropertyScope, () => new RuntimePropertyScope(container));
        container.registerSingleton(RuntimeMethodScope, () => new RuntimeMethodScope(container));
        container.registerSingleton(RuntimeParamScope, () => new RuntimeParamScope(container));


        container.get(IocBeforeConstructorScope).setup(container);
        container.get(IocAfterConstructorScope).setup(container);
        container.get(RuntimePropertyScope).setup(container);
        container.get(RuntimeMethodScope).setup(container);
        container.get(RuntimeParamScope).setup(container);
        container.get(RuntimeAnnoationScope).setup(container);

        this.use(ContainerCheckerAction)
            .use(InitReflectAction)
            .use(GetSingletionAction)
            .use(IocGetCacheAction)
            .use(ConstructorArgsAction)
            .use(IocBeforeConstructorScope)
            .use(CreateInstanceAction)
            .use(IocAfterConstructorScope)
            .use(RuntimePropertyScope)
            .use(RuntimeMethodScope)
            .use(RuntimeAnnoationScope);

    }

    protected getParameters<T>(container: IIocContainer, type: Type<T>, instance?: T, propertyKey?: string): IParameter[] {
        propertyKey = propertyKey || 'constructor';
        let ctx = RuntimeActionContext.parse({
            targetType: type,
            target: instance,
            propertyKey: propertyKey
        }, container);
        this.execActions(ctx, [InitReflectAction, RuntimeParamScope]);
        let params = ctx.targetReflect.methodParams.get(propertyKey);
        return params || [];
    }
}
