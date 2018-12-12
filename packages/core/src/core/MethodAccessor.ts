import { IContainer } from '../IContainer';
import { IMethodAccessor } from '../IMethodAccessor';
import { BindParameterProviderActionData, CoreActions, LifeState } from './actions';
import { isToken, isFunction, assert, assertExp } from '../utils';
import { Token } from '../types';
import { IParameter } from '../IParameter';
import { IProviderParser, ProviderParserToken, ParamProviders } from '../providers';

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

    async invoke<T>(token: Token<any>, propertyKey: string, target?: any, ...providers: ParamProviders[]): Promise<T> {
        if (!target) {
            target = this.container.resolve(token, ...providers);
        }

        let targetClass = this.container.getTokenImpl(token);
        assert(targetClass, token.toString() + ' is not implements by any class.');
        assertExp(target && isFunction(target[propertyKey]), `type: ${targetClass} has no method ${propertyKey.toString()}.`);
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

    }

    syncInvoke<T>(token: Token<any>, propertyKey: string, target?: any, ...providers: ParamProviders[]): T {
        if (!target) {
            target = this.container.resolve(token, ...providers);
        }
        let targetClass = this.container.getTokenImpl(token);
        assert(targetClass, token.toString() + ' is not implements by any class.');
        assertExp(target && isFunction(target[propertyKey]), `type: ${targetClass} has no method ${propertyKey.toString()}.`);

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
    }

    createSyncParams(params: IParameter[], ...providers: ParamProviders[]): any[] {
        let providerMap = this.getMatcher().parse(params, ...providers);
        return params.map((param, index) => {
            if (param.name && providerMap.hasRegister(param.name)) {
                return providerMap.resolve(param.name);
            } else if (isToken(param.type)) {
                if (providerMap.hasRegister(param.type)) {
                    return providerMap.resolve(param.type);
                }
                return this.container.resolve(param.type, providerMap);
            } else {
                return undefined;
            }
        });
    }

    createParams(params: IParameter[], ...providers: ParamProviders[]): Promise<any[]> {
        let providerMap = this.getMatcher().parse(params, ...providers);
        return Promise.all(params.map((param, index) => {
            if (param.name && providerMap.hasRegister(param.name)) {
                return providerMap.resolve(param.name);
            } else if (isToken(param.type)) {
                if (providerMap.hasRegister(param.type)) {
                    return providerMap.resolve(param.type);
                }
                return this.container.resolve(param.type, providerMap);
            } else {
                return undefined;
            }
        }));
    }
}
