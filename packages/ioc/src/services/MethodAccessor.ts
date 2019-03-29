import { Token, Type } from '../types';
import { IParameter } from '../IParameter';
import { ParamProviders, isProvider, ProviderParser } from '../providers';
import { isToken, isNullOrUndefined, lang, isFunction } from '../utils';
import { IIocContainer } from '../IIocContainer';
import { IocCoreService } from './IocCoreService';
import { RuntimeLifeScope } from './RuntimeLifeScope';

/**
 * execution, invoke some type method.
 *
 * @export
 * @interface IExecution
 */
export interface IMethodAccessor {

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {IIocContainer} container
     * @param {*} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    invoke<T>(container: IIocContainer, target: any, propertyKey: string, ...providers: ParamProviders[]): T;

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {Token<any>} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    invoke<T>(container: IIocContainer, target: Token<any>, propertyKey: string, ...providers: ParamProviders[]): T;

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {IIocContainer} container
     * @param {Token<any>} target
     * @param {string} propertyKey
     * @param {*} instance
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    invoke<T>(container: IIocContainer, target: Token<any>, propertyKey: string, instance: any, ...providers: ParamProviders[]): T;

    /**
     * create params instances with IParameter and provider
     *
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {any[]}
     * @memberof IMethodAccessor
     */
    createParams(container: IIocContainer, params: IParameter[], ...providers: ParamProviders[]): any[];
}



/**
 * method accessor
 *
 * @export
 * @class MethodAccessor
 * @implements {IMethodAccessor}
 */
export class MethodAccessor extends IocCoreService implements IMethodAccessor {

    constructor() {
        super();
    }

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {IIocContainer} container
     * @param {*} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    invoke<T>(container: IIocContainer, target: any, propertyKey: string, instance?: any, ...providers: ParamProviders[]): T {

        let targetClass: Type<any>;
        if (isProvider(instance)) {
            providers.unshift(instance);
            instance = undefined;
        }
        if (isToken(target)) {
            if (isNullOrUndefined(instance)) {
                targetClass = container.getTokenProvider(target);
                instance = container.resolve(target, ...providers);
            } else {
                targetClass = lang.getClass(instance) || container.getTokenProvider(target);
            }
            lang.assert(targetClass, target.toString() + ' is not implements by any class.');
        } else {
            targetClass = lang.getClass(target);
            instance = target;
        }
        lang.assertExp(instance && isFunction(instance[propertyKey]), `type: ${targetClass} has no method ${propertyKey.toString()}.`);
        let lifeScope = container.resolve(RuntimeLifeScope);
        let pds = lifeScope.getParamProviders(container, targetClass, propertyKey, instance);
        providers = providers.concat(pds);
        let parameters = lifeScope.getMethodParameters(container, targetClass, instance, propertyKey);
        let paramInstances = this.createParams(container, parameters, ...providers);

        return instance[propertyKey](...paramInstances) as T;

    }

    createParams(container: IIocContainer, params: IParameter[], ...providers: ParamProviders[]): any[] {
        let providerMap = container.get(ProviderParser).parse(...providers);
        return params.map((param, index) => {
            if (param.provider) {
                if (providerMap.has(param.provider)) {
                    return providerMap.resolve(param.provider);
                }
                return container.resolve(param.provider, providerMap);
            } else if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            } else if (isToken(param.type)) {
                if (providerMap.has(param.type)) {
                    return providerMap.resolve(param.type);
                }
                return container.resolve(param.type, providerMap);
            } else {
                return undefined;
            }
        });
    }
}
