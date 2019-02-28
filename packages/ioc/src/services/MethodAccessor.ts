import { Token, Type } from '../types';
import { IParameter } from '../IParameter';
import { ParamProviders, isProvider, ProviderParser } from '../providers';
import { isToken, isNullOrUndefined, lang, isFunction } from '../utils';
import { IContainer } from '../IContainer';
import { IocService } from './IocService';

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
     * @param {IContainer} container
     * @param {*} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(container: IContainer, target: any, propertyKey: string, ...providers: ParamProviders[]): Promise<T>;

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
    invoke<T>(container: IContainer, target: Token<any>, propertyKey: string, ...providers: ParamProviders[]): Promise<T>;

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {IContainer} container
     * @param {Token<any>} target
     * @param {string} propertyKey
     * @param {*} instance
     * @param {...ParamProviders[]} providers
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(container: IContainer, target: Token<any>, propertyKey: string, instance: any, ...providers: ParamProviders[]): Promise<T>;

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
    syncInvoke<T>(container: IContainer, target: any, propertyKey: string, ...providers: ParamProviders[]): T;
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
    syncInvoke<T>(container: IContainer, target: any, propertyKey: string, ...providers: ParamProviders[]): T;

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
    syncInvoke<T>(container: IContainer, target: any, propertyKey: string, instance: any, ...providers: ParamProviders[])

    /**
     * create params instances with IParameter and provider.
     *
     * @param {IParameter[]} params
     * @param {...ParamProvider[]} providers
     * @returns {any[]}
     * @memberof IMethodAccessor
     */
    createSyncParams(container: IContainer, params: IParameter[], ...providers: ParamProviders[]): any[];

    /**
     * create params instances with IParameter and provider
     *
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {Promise<any[]>}
     * @memberof IMethodAccessor
     */
    createParams(container: IContainer,params: IParameter[], ...providers: ParamProviders[]): Promise<any[]>;
}



/**
 * method accessor
 *
 * @export
 * @class MethodAccessor
 * @implements {IMethodAccessor}
 */
export class MethodAccessor extends IocService implements IMethodAccessor {

    constructor() {
        super();
    }

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {IContainer} container
     * @param {*} target
     * @param {string} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    async invoke<T>(container: IContainer, target: any, propertyKey: string, instance?: any, ...providers: ParamProviders[]): Promise<T> {

        let targetClass: Type<any>;
        if (isProvider(instance)) {
            providers.unshift(instance);
            instance = undefined;
        }
        if (isToken(target)) {
            if (isNullOrUndefined(instance)) {
                targetClass = container.getTokenImpl(target);
                instance = container.resolve(target, ...providers);
            } else {
                targetClass = lang.getClass(instance) || container.getTokenImpl(target);
            }
            lang.assert(targetClass, target.toString() + ' is not implements by any class.');
        } else {
            targetClass = lang.getClass(target);
            instance = target;
        }

        lang.assertExp(instance && isFunction(instance[propertyKey]), `type: ${targetClass} has no method ${propertyKey.toString()}.`);
        let actionData = {
            target: instance,
            targetType: targetClass,
            propertyKey: propertyKey,
        } as BindParameterProviderActionData;
        let lifeScope = container.getLifeScope();
        lifeScope.execute(actionData, LifeState.onInit, CoreActions.bindParameterProviders);
        providers = providers.concat(actionData.execResult);

        let parameters = lifeScope.getMethodParameters(targetClass, instance, propertyKey);

        let paramInstances = await this.createParams(parameters, ...providers);

        return instance[propertyKey](...paramInstances) as T;

    }

    syncInvoke<T>(container: IContainer, target: any, propertyKey: string, instance?: any, ...providers: ParamProviders[]): T {
        let targetClass: Type<any>;
        if (isProvider(instance)) {
            providers.unshift(instance);
            instance = undefined;
        }
        if (isToken(target)) {
            targetClass = container.getTokenImpl(target);
            lang.assert(targetClass, target.toString() + ' is not implements by any class.');
            if (isNullOrUndefined(instance)) {
                instance = container.resolve(target, ...providers);
            }
        } else {
            targetClass = lang.getClass(target);
            instance = target;
        }
        lang.assertExp(instance && isFunction(instance[propertyKey]), `type: ${targetClass} has no method ${propertyKey.toString()}.`);

        let actionData = {
            target: instance,
            targetType: targetClass,
            propertyKey: propertyKey,
        } as BindParameterProviderActionData;
        let lifeScope = this.container.getLifeScope();
        lifeScope.execute(actionData, LifeState.onInit, CoreActions.bindParameterProviders);

        providers = providers.concat(actionData.execResult);
        let parameters = lifeScope.getMethodParameters(targetClass, instance, propertyKey);
        let paramInstances = this.createSyncParams(parameters, ...providers);

        return instance[propertyKey](...paramInstances) as T;
    }

    createSyncParams(container: IContainer, params: IParameter[], ...providers: ParamProviders[]): any[] {
        let providerMap = container.get(ProviderParser).parse(...providers);
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

    createParams(container: IContainer, params: IParameter[], ...providers: ParamProviders[]): Promise<any[]> {
        let providerMap = container.get(ProviderParser).parse(...providers);
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
