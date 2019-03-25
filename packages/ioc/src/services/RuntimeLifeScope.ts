import { ParamProviders } from '../providers';
import { Type } from '../types';
import {
    IocGetCacheAction, RuntimeMethodScope,
    BindParameterProviderAction, BindParameterTypeAction,
    BindPropertyTypeAction, ComponentBeforeInitAction, ComponentInitAction,
    ComponentAfterInitAction, RegisterSingletionAction, InjectPropertyAction,
    GetSingletionAction, ContainerCheckerAction, IocSetCacheAction,
    CreateInstanceAction, ConstructorArgsAction, MethodAutorunAction, RuntimeActionContext,
    IocBeforeConstructorScope, IocAfterConstructorScope,
    IocParameterScope, IocAutorunAction, RuntimeAnnoationScope, RuntimePropertyScope, InitReflectAction
} from '../actions';
import { IIocContainer } from '../IIocContainer';
import { IParameter } from '../IParameter';
import { RuntimeDecoratorRegisterer } from './DecoratorRegisterer';
import { Inject, AutoWired, Method, Param, Autorun, Component, Injectable } from '../decorators';
import { RegisterLifeScope } from './RegisterLifeScope';
import { DecoratorType } from '../factories';

/**
 * runtime life scope.
 *
 * @export
 * @class RuntimeLifeScope
 * @extends {LifeScope}
 */
export class RuntimeLifeScope extends RegisterLifeScope<RuntimeActionContext> {

    getParamProviders(container: IIocContainer, type: Type<any>, propertyKey: string, target?: any): ParamProviders[] {
        let ctx = RuntimeActionContext.parse({
            targetType: type,
            target: target,
            propertyKey: propertyKey
        }, container);
        this.execActions(ctx, [InitReflectAction, BindParameterProviderAction]);
        return ctx.targetReflect.methodParamProviders[propertyKey] || [];
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
        container.registerSingleton(GetSingletionAction, () => new GetSingletionAction(container));
        container.registerSingleton(IocGetCacheAction, () => new IocGetCacheAction(container));
        container.registerSingleton(ContainerCheckerAction, () => new ContainerCheckerAction(container));
        container.registerSingleton(ConstructorArgsAction, () => new ConstructorArgsAction(container));
        container.registerSingleton(CreateInstanceAction, () => new CreateInstanceAction(container));

        container.registerSingleton(ComponentBeforeInitAction, () => new ComponentBeforeInitAction(container));
        container.registerSingleton(BindPropertyTypeAction, () => new BindPropertyTypeAction(container));
        container.registerSingleton(InjectPropertyAction, () => new InjectPropertyAction(container));
        container.registerSingleton(ComponentInitAction, () => new ComponentInitAction(container));
        container.registerSingleton(BindParameterProviderAction, () => new BindParameterProviderAction(container));
        container.registerSingleton(BindParameterTypeAction, () => new BindParameterTypeAction(container));
        container.registerSingleton(ComponentAfterInitAction, () => new ComponentAfterInitAction(container));
        container.registerSingleton(RegisterSingletionAction, () => new RegisterSingletionAction(container));
        container.registerSingleton(IocSetCacheAction, () => new IocSetCacheAction(container));
        container.registerSingleton(MethodAutorunAction, () => new MethodAutorunAction(container));

        container.registerSingleton(IocAutorunAction, () => new IocAutorunAction(container));

        container.registerSingleton(IocBeforeConstructorScope, () => new IocBeforeConstructorScope(container));
        container.registerSingleton(IocAfterConstructorScope, () => new IocAfterConstructorScope(container));

        container.registerSingleton(RuntimeAnnoationScope, () => new RuntimeAnnoationScope(container));
        container.registerSingleton(RuntimePropertyScope, () => new RuntimePropertyScope(container));
        container.registerSingleton(RuntimeMethodScope, () => new RuntimeMethodScope(container));
        // container.registerSingleton(IocParameterScope, () => new IocParameterScope(container));

        let decRgr = container.get(RuntimeDecoratorRegisterer);

        decRgr.register(Inject, DecoratorType.Property, BindPropertyTypeAction, BindPropertyTypeAction);
        decRgr.register(AutoWired, DecoratorType.Property, BindPropertyTypeAction, BindPropertyTypeAction);

        decRgr.register(Inject, DecoratorType.Parameter, BindParameterTypeAction);
        decRgr.register(AutoWired, DecoratorType.Parameter, BindParameterTypeAction);
        decRgr.register(Param, DecoratorType.Parameter, BindParameterTypeAction);

        decRgr.register(Method, DecoratorType.Method, BindParameterProviderAction);
        decRgr.register(Autorun, DecoratorType.Method, BindParameterProviderAction, MethodAutorunAction);

        decRgr.register(Autorun, DecoratorType.Class, IocAutorunAction);
        decRgr.register(Injectable, DecoratorType.Class, RegisterSingletionAction, IocSetCacheAction);
        decRgr.register(Component, DecoratorType.Class, ComponentBeforeInitAction, ComponentInitAction, ComponentAfterInitAction, RegisterSingletionAction, IocSetCacheAction);


        container.get(RuntimeAnnoationScope).setup();
        container.get(RuntimePropertyScope).setup();
        container.get(RuntimeMethodScope).setup();

        this.use(ContainerCheckerAction)
            .use(InitReflectAction)
            .use(GetSingletionAction)
            .use(IocGetCacheAction)
            .use(ConstructorArgsAction)
            .use(IocBeforeConstructorScope)
            .use(CreateInstanceAction)
            .use(IocAfterConstructorScope)
            .use(RuntimePropertyScope)
            .use(RuntimeAnnoationScope)
            .use(RuntimeMethodScope);

    }

    protected getParameters<T>(container: IIocContainer, type: Type<T>, instance?: T, propertyKey?: string): IParameter[] {
        propertyKey = propertyKey || 'constructor';
        let ctx = RuntimeActionContext.parse({
            targetType: type,
            target: instance,
            propertyKey: propertyKey
        }, container);
        this.execActions(ctx, [InitReflectAction, BindParameterTypeAction]);

        let params = ctx.targetReflect.methodParams[propertyKey]

        if (params.length) {
            return params;
        } else {
            let paramNames = this.getParamerterNames(type, propertyKey);
            return paramNames.map(name => {
                return {
                    name: name,
                    type: undefined
                }
            });
        }
    }
}
