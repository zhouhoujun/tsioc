import { LifeScope } from './LifeScope';
import { ParamProviders } from '../providers';
import { Type } from '../types';
import { IocActionContext, BindParameterProviderAction, BindParameterTypeAction, BindPropertyTypeAction } from '../actions';
import { IIocContainer } from '../IIocContainer';
import { IParameter } from '../IParameter';
import { DecoratorRegisterer } from './DecoratorRegisterer';
import { Inject, AutoWired, Method, Param } from '../decorators';


/**
 * runtime life scope.
 *
 * @export
 * @class RuntimeLifeScope
 * @extends {LifeScope}
 */
export class RuntimeLifeScope extends LifeScope {
    constructor() {
        super();
    }

    getParamProviders(container: IIocContainer, type: Type<any>, propertyKey: string, target?: any): ParamProviders[] {
        let ctx: IocActionContext = {
            target: target,
            targetType: type,
            propertyKey: propertyKey,
        };
        this.execActions(container, ctx, [BindParameterProviderAction]);
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
        container.registerSingleton(BindParameterProviderAction, () => new BindParameterProviderAction());
        container.registerSingleton(BindParameterTypeAction, ()=> new BindParameterTypeAction());

        let decRgr = container.resolve(DecoratorRegisterer);
        decRgr.register(Inject, BindParameterTypeAction, BindPropertyTypeAction);
        decRgr.register(AutoWired, BindParameterTypeAction, BindPropertyTypeAction);
        decRgr.register(Param, BindParameterTypeAction);
        decRgr.register(Method, BindParameterProviderAction);
            
        this.use(BindParameterProviderAction)
            .use(BindParameterTypeAction);
        
    }
    
    protected getParameters<T>(container: IIocContainer, type: Type<T>, instance?: T, propertyKey?: string): IParameter[] {
        propertyKey = propertyKey || 'constructor';
        let ctx: IocActionContext = {
            target: instance,
            targetType: type,
            propertyKey: propertyKey
        };
        this.execActions(container, ctx, [BindParameterTypeAction]);

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