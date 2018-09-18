import { IContainer } from '../IContainer';
import { IMethodAccessor } from '../IMethodAccessor';
import { BindParameterProviderActionData, CoreActions, LifeState } from './actions';
import { isToken, isFunction } from '../utils';
import { Token, Providers } from '../types';
import { IParameter } from '../IParameter';
import { IProviderParser, ProviderParserToken } from './IProviderParser';

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

    getMatcher(): IProviderParser {
        return this.container.get(ProviderParserToken);
    }

    async invoke<T>(token: Token<any>, propertyKey: string, target?: any, ...providers: Providers[]): Promise<T> {
        if (!target) {
            target = this.container.resolve(token, ...providers);
        }

        let targetClass = this.container.getTokenImpl(token);
        if (!targetClass) {
            throw Error(token.toString() + ' is not implements by any class.');
        }
        if (target && isFunction(target[propertyKey])) {
            let actionData = {
                target: target,
                targetType: targetClass,
                propertyKey: propertyKey,
            } as BindParameterProviderActionData;
            let lifeScope = this.container.getLifeScope();
            lifeScope.execute(actionData, LifeState.onInit, CoreActions.bindParameterProviders);
            providers = providers.concat(actionData.execResult);

            let parameters = lifeScope.getMethodParameters(targetClass, target, propertyKey);

            let paramInstances = await this.createParams(parameters, ...providers);

            return target[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${targetClass} has no method ${propertyKey.toString()}.`)
        }
    }

    syncInvoke<T>(token: Token<any>, propertyKey: string, target?: any, ...providers: Providers[]): T {
        if (!target) {
            target = this.container.resolve(token, ...providers);
        }
        let targetClass = this.container.getTokenImpl(token);
        if (!targetClass) {
            throw Error(token.toString() + ' is not implements by any class.')
        }

        if (target && isFunction(target[propertyKey])) {
            let actionData = {
                target: target,
                targetType: targetClass,
                propertyKey: propertyKey,
            } as BindParameterProviderActionData;
            let lifeScope = this.container.getLifeScope();
            lifeScope.execute(actionData, LifeState.onInit, CoreActions.bindParameterProviders);


            providers = providers.concat(actionData.execResult);
            let parameters = lifeScope.getMethodParameters(targetClass, target, propertyKey);
            let paramInstances = this.createSyncParams(parameters, ...providers);

            return target[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${targetClass} has no method ${propertyKey.toString()}.`)
        }
    }

    createSyncParams(params: IParameter[], ...providers: Providers[]): any[] {
        let providerMap = this.getMatcher().parse(params, ...providers);
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

    createParams(params: IParameter[], ...providers: Providers[]): Promise<any[]> {
        let providerMap = this.getMatcher().parse(params, ...providers);
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
