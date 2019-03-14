import { LifeScope } from './LifeScope';
import { ParamProviders } from '../providers';
import { Type } from '../types';
import {
    InitReflectAction, IocGetCacheAction, RegisterActionContext,
    BindParameterProviderAction, BindParameterTypeAction,
    BindPropertyTypeAction, ComponentBeforeInitAction, ComponentInitAction,
    ComponentAfterInitAction, RegisterSingletionAction, InjectPropertyAction,
    GetSingletionAction, ContainerCheckerAction, IocSetCacheAction,
    CreateInstanceAction, ConstructorArgsAction, MethodAutorunAction
} from '../actions';
import { IIocContainer } from '../IIocContainer';
import { IParameter } from '../IParameter';
import { DecoratorRegisterer } from './DecoratorRegisterer';
import { Inject, AutoWired, Method, Param, Autorun } from '../decorators';

/**
 * runtime life scope.
 *
 * @export
 * @class RuntimeLifeScope
 * @extends {LifeScope}
 */
export class RuntimeLifeScope extends LifeScope<RegisterActionContext> {
    constructor() {
        super();
    }

    getParamProviders(container: IIocContainer, type: Type<any>, propertyKey: string, target?: any): ParamProviders[] {
        let ctx = container.bindActionContext(
            RegisterActionContext.create({
                targetType: type,
                target: target,
                propertyKey: propertyKey
            }));
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
        if (!container.hasRegister(InitReflectAction)) {
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

        let decRgr = container.resolveToken(DecoratorRegisterer);
        decRgr.register(Inject, BindParameterTypeAction, BindPropertyTypeAction);
        decRgr.register(AutoWired, BindParameterTypeAction, BindPropertyTypeAction);
        decRgr.register(Param, BindParameterTypeAction);
        decRgr.register(Method, BindParameterProviderAction);
        decRgr.register(Autorun, MethodAutorunAction);

        this.use(InitReflectAction)
            .use(GetSingletionAction)
            .use(IocGetCacheAction)
            .use(ContainerCheckerAction)
            .use(ConstructorArgsAction)
            .use(CreateInstanceAction)
            .use(ComponentBeforeInitAction)
            .use(BindPropertyTypeAction)
            .use(InjectPropertyAction)
            .use(BindParameterProviderAction)
            .use(BindParameterTypeAction)
            .use(ComponentInitAction)
            .use(RegisterSingletionAction)
            .use(IocSetCacheAction)
            .use(ComponentAfterInitAction)
            .use(MethodAutorunAction)

    }

    protected getParameters<T>(container: IIocContainer, type: Type<T>, instance?: T, propertyKey?: string): IParameter[] {
        propertyKey = propertyKey || 'constructor';
        let ctx = container.bindActionContext(
            RegisterActionContext.create({
                targetType: type,
                target: instance,
                propertyKey: propertyKey
            }));
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
