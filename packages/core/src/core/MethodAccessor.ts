import { IContainer } from '../IContainer';
import { IMethodAccessor } from '../IMethodAccessor';
import { BindParameterProviderActionData, CoreActions, LifeState } from './actions';
import { isToken, isFunction, lang, isNullOrUndefined } from '../utils';
import { Type } from '../types';
import { IParameter } from '../IParameter';
import { ParamProviders, isProvider } from '../providers';

/**
 * method accessor
 *
 * @export
 * @class MethodAccessor
 * @implements {IMethodAccessor}
 */
export class MethodAccessor implements IMethodAccessor {

    constructor(private container: IContainer) {

    }

    async invoke<T>(target: any, propertyKey: string, instance?: any, ...providers: ParamProviders[]): Promise<T> {

        let targetClass: Type<any>;
        if (isProvider(instance)) {
            providers.unshift(instance);
            instance = undefined;
        }
        if (isToken(target)) {
            if (isNullOrUndefined(instance)) {
                targetClass = this.container.getTokenImpl(target);
                instance = this.container.resolve(target, ...providers);
            } else {
                targetClass = lang.getClass(instance) || this.container.getTokenImpl(target);
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
        let lifeScope = this.container.getLifeScope();
        lifeScope.execute(actionData, LifeState.onInit, CoreActions.bindParameterProviders);
        providers = providers.concat(actionData.execResult);

        let parameters = lifeScope.getMethodParameters(targetClass, instance, propertyKey);

        let paramInstances = await this.createParams(parameters, ...providers);

        return instance[propertyKey](...paramInstances) as T;

    }

    syncInvoke<T>(target: any, propertyKey: string, instance?: any, ...providers: ParamProviders[]): T {
        let targetClass: Type<any>;
        if (isProvider(instance)) {
            providers.unshift(instance);
            instance = undefined;
        }
        if (isToken(target)) {
            targetClass = this.container.getTokenImpl(target);
            lang.assert(targetClass, target.toString() + ' is not implements by any class.');
            if (isNullOrUndefined(instance)) {
                instance = this.container.resolve(target, ...providers);
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

    createSyncParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        let providerMap = this.container.getProviderParser().parse(...providers);
        return params.map((param, index) => {
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            } else if (isToken(param.type)) {
                if (providerMap.has(param.type)) {
                    return providerMap.resolve(param.type);
                }
                return this.container.resolve(param.type, providerMap);
            } else {
                return undefined;
            }
        });
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): Promise<any[]> {
        let providerMap = this.container.getProviderParser().parse(...providers);
        return Promise.all(params.map((param, index) => {
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            } else if (isToken(param.type)) {
                if (providerMap.has(param.type)) {
                    return providerMap.resolve(param.type);
                }
                return this.container.resolve(param.type, providerMap);
            } else {
                return undefined;
            }
        }));
    }
}
