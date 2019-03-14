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
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(container: IIocContainer, target: any, propertyKey: string, ...providers: ParamProviders[]): Promise<T>;

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {Token<any>} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(container: IIocContainer, target: Token<any>, propertyKey: string, ...providers: ParamProviders[]): Promise<T>;

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {IIocContainer} container
     * @param {Token<any>} target
     * @param {string} propertyKey
     * @param {*} instance
     * @param {...ParamProviders[]} providers
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(container: IIocContainer, target: Token<any>, propertyKey: string, instance: any, ...providers: ParamProviders[]): Promise<T>;

    /**
     * try to invoke the method of intance, if is token will create instance to invoke.
     *
     * @template T
     * @param {*} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    syncInvoke<T>(container: IIocContainer, target: any, propertyKey: string, ...providers: ParamProviders[]): T;
    /**
     * try create instance to invoke property method.
     *
     * @template T
     * @param {*} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    syncInvoke<T>(container: IIocContainer, target: any, propertyKey: string, ...providers: ParamProviders[]): T;

    /**
     * try to invoke the method of intance, if is token will create instance to invoke.
     *
     * @template T
     * @param {*} target
     * @param {string} propertyKey
     * @param {*} instance
     * @param {...ParamProviders[]} providers
     * @memberof IMethodAccessor
     */
    syncInvoke<T>(container: IIocContainer, target: any, propertyKey: string, instance: any, ...providers: ParamProviders[])

    /**
     * create params instances with IParameter and provider.
     *
     * @param {IParameter[]} params
     * @param {...ParamProvider[]} providers
     * @returns {any[]}
     * @memberof IMethodAccessor
     */
    createSyncParams(container: IIocContainer, params: IParameter[], ...providers: ParamProviders[]): any[];

    /**
     * create params instances with IParameter and provider
     *
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {Promise<any[]>}
     * @memberof IMethodAccessor
     */
    createParams(container: IIocContainer, params: IParameter[], ...providers: ParamProviders[]): Promise<any[]>;
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
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    async invoke<T>(container: IIocContainer, target: any, propertyKey: string, instance?: any, ...providers: ParamProviders[]): Promise<T> {

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
        let paramInstances = await this.createParams(container, parameters, ...providers);

        return instance[propertyKey](...paramInstances) as T;

    }

    syncInvoke<T>(container: IIocContainer, target: any, propertyKey: string, instance?: any, ...providers: ParamProviders[]): T {
        let targetClass: Type<any>;
        if (isProvider(instance)) {
            providers.unshift(instance);
            instance = undefined;
        }
        if (isToken(target)) {
            targetClass = container.getTokenProvider(target);
            lang.assert(targetClass, target.toString() + ' is not implements by any class.');
            if (isNullOrUndefined(instance)) {
                instance = container.resolve(target, ...providers);
            }
        } else {
            targetClass = lang.getClass(target);
            instance = target;
        }
        lang.assertExp(instance && isFunction(instance[propertyKey]), `type: ${targetClass} has no method ${propertyKey.toString()}.`);

        let lifeScope = container.resolveToken(RuntimeLifeScope);
        let pds = lifeScope.getParamProviders(container, targetClass, propertyKey, instance);
        providers = providers.concat(pds);
        let parameters = lifeScope.getMethodParameters(container, targetClass, instance, propertyKey);
        let paramInstances = this.createSyncParams(container, parameters, ...providers);
        return instance[propertyKey](...paramInstances) as T;
    }

    createSyncParams(container: IIocContainer, params: IParameter[], ...providers: ParamProviders[]): any[] {
        let providerMap = container.resolveToken(ProviderParser).parse(...providers);
        return params.map((param, index) => {
            if (param.name && providerMap.has(param.name)) {
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

    createParams(container: IIocContainer, params: IParameter[], ...providers: ParamProviders[]): Promise<any[]> {
        let providerMap = container.resolveToken(ProviderParser).parse(...providers);
        return Promise.all(params.map((param, index) => {
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            } else if (isToken(param.type)) {
                if (providerMap.has(param.type)) {
                    return providerMap.resolve(param.type);
                }
                return container.resolve(param.type, providerMap);
            } else {
                return undefined;
            }
        }));
    }
}
