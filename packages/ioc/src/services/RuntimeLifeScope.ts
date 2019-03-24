import { ParamProviders } from '../providers';
import { Type } from '../types';
import {
    InitReflectAction, IocGetCacheAction,
    BindParameterProviderAction, BindParameterTypeAction,
    BindPropertyTypeAction, ComponentBeforeInitAction, ComponentInitAction,
    ComponentAfterInitAction, RegisterSingletionAction, InjectPropertyAction,
    GetSingletionAction, ContainerCheckerAction, IocSetCacheAction,
    CreateInstanceAction, ConstructorArgsAction, MethodAutorunAction, RuntimeActionContext,
    IocBeforeConstructorScope, IocAfterConstructorScope, IocInitInstanceScope, IocBindMethodScope
} from '../actions';
import { IIocContainer } from '../IIocContainer';
import { IParameter } from '../IParameter';
import { DecoratorRegisterer } from './DecoratorRegisterer';
import { Inject, AutoWired, Method, Param, Autorun } from '../decorators';
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
        let ctx = RuntimeActionContext.parse({
            targetType: type,
            target: target,
            propertyKey: propertyKey
        }, container);
        this.execActions(ctx, [InitReflectAction, BindParameterProviderAction]);
        return ctx.targetReflect.methodProviders[propertyKey] || [];
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

    registerDefault(container: IIocContainer) {
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


        container.registerSingleton(IocBeforeConstructorScope, () => new IocBeforeConstructorScope(container));
        container.registerSingleton(IocAfterConstructorScope, () => new IocAfterConstructorScope(container));
        container.registerSingleton(IocInitInstanceScope, () => new IocInitInstanceScope(container));
        container.registerSingleton(IocBindMethodScope, () => new IocBindMethodScope(container));


        let decRgr = container.get(DecoratorRegisterer);
        decRgr.register(Inject, BindParameterTypeAction, BindPropertyTypeAction);
        decRgr.register(AutoWired, BindParameterTypeAction, BindPropertyTypeAction);
        decRgr.register(Param, BindParameterTypeAction);
        decRgr.register(Method, BindParameterProviderAction);
        decRgr.register(Autorun, MethodAutorunAction);

        container.get(IocInitInstanceScope)
            .use(ComponentBeforeInitAction)
            .use(BindPropertyTypeAction)
            .use(InjectPropertyAction)
            .use(BindParameterProviderAction)
            .use(BindParameterTypeAction)
            .use(ComponentInitAction)
            .use(ComponentAfterInitAction)
            .after(RegisterSingletionAction)
            .after(IocSetCacheAction);

        this.use(ContainerCheckerAction)
            .use(InitReflectAction)
            .use(GetSingletionAction)
            .use(IocGetCacheAction)
            .use(ConstructorArgsAction)
            .use(IocBeforeConstructorScope)
            .use(CreateInstanceAction)
            .use(IocAfterConstructorScope)
            .use(IocInitInstanceScope)
            .use(IocBindMethodScope)
            .use(MethodAutorunAction);

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
