import { IContainer } from '../IContainer';
import { ParamProvider, AsyncParamProvider, ProviderMap } from './providers/index';
import { IMethodAccessor } from '../IMethodAccessor';
import { Type } from '../Type';
import { BindParameterProviderActionData, CoreActions } from './actions/index';
import { symbols, isToken, isFunction, isUndefined, isString } from '../utils/index';
import { Token, Providers } from '../types';
import { Container } from '../Container';
import { IContainerBuilder } from '../IContainerBuilder';
import { IParameter } from '../IParameter';
import { DecoratorType } from './factories/index';
import { IProviderMatcher } from './IProviderMatcher';
import { NonePointcut } from './decorators/index';


@NonePointcut()
export class MethodAccessor implements IMethodAccessor {

    constructor(private container: IContainer) {

    }

    getMatcher(): IProviderMatcher {
        return this.container.get<IProviderMatcher>(symbols.IProviderMatcher);
    }

    async invoke<T>(token: Token<any>, propertyKey: string | symbol, target?: any, ...providers: Providers[]): Promise<T> {
        if (!target) {
            target = this.container.resolve(token, ...providers);
        }

        let targetClass = this.container.getTokenImpl(token);
        if (!targetClass) {
            throw Error(token.toString() + 'is not implements by any class.');
        }
        if (target && isFunction(target[propertyKey])) {
            let actionData = {
                target: target,
                targetType: targetClass,
                propertyKey: propertyKey,
            } as BindParameterProviderActionData;
            let lifeScope = this.container.getLifeScope();
            lifeScope.execute(DecoratorType.Parameter, actionData, CoreActions.bindParameterProviders);
            providers = providers.concat(actionData.execResult);

            let parameters = lifeScope.getMethodParameters(targetClass, target, propertyKey);

            let paramInstances = await this.createParams(parameters, ...providers);

            return target[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${targetClass} has no method ${propertyKey}.`)
        }
    }

    syncInvoke<T>(token: Token<any>, propertyKey: string | symbol, target?: any, ...providers: Providers[]): T {
        if (!target) {
            target = this.container.resolve(token, ...providers);
        }
        let targetClass = this.container.getTokenImpl(token);
        if (!targetClass) {
            throw Error(token.toString() + 'is not implements by any class.')
        }

        if (target && isFunction(target[propertyKey])) {
            let actionData = {
                target: target,
                targetType: targetClass,
                propertyKey: propertyKey,
            } as BindParameterProviderActionData;
            let lifeScope = this.container.getLifeScope();
            lifeScope.execute(DecoratorType.Parameter, actionData, CoreActions.bindParameterProviders);


            providers = providers.concat(actionData.execResult);
            let parameters = lifeScope.getMethodParameters(targetClass, target, propertyKey);
            let paramInstances = this.createSyncParams(parameters, ...providers);

            return target[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${targetClass} has no method ${propertyKey}.`)
        }
    }

    createSyncParams(params: IParameter[], ...providers: Providers[]): any[] {
        let providerMap = this.getMatcher().matchProviders(params, ...providers);
        return params.map((param, index) => {
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            } else if (isToken(param.type)) {
                return this.container.resolve(param.type, ...providers);
            } else {
                return undefined;
            }
        });
    }

    createParams(params: IParameter[], ...providers: Providers[]): Promise<any[]> {
        let providerMap = this.getMatcher().matchProviders(params, ...providers);
        return Promise.all(params.map((param, index) => {
            if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            } else if (isToken(param.type)) {
                return this.container.resolve(param.type, ...providers);
            } else {
                return undefined;
            }
        }));
    }
    //     return this.createParam(param, index, providerMap, providers, async (provider: AsyncParamProvider) => {

    //         let buider = this.container.get<IContainerBuilder>(symbols.IContainerBuilder);
    //         let modules = await buider.loadModule(this.container, {
    //             files: provider.files
    //         });
    //         let params = await Promise.all(modules.map((mdl) => {
    //             return this.container.invoke<any>(mdl, provider.execution)
    //         }));

    //         return modules.length === 1 ? params[0] : params;
    //     });
    // }));
    // }

    // protected createParam(param: IParameter, index: number, providerMap: ProviderMap, providers: Providers[], extensds?: (provider: ParamProvider) => any) {
    //     if (providerMap && param.name) {
    //         let provider = providerMap[param.name];

    //         if (!isUndefined(provider)) {
    //             if (isFunction(provider)) {
    //                 return provider(this.container);
    //             }

    //             if (!isUndefined(provider.value)) {
    //                 return isFunction(provider.value) ? provider.value(this.container) : provider.value;
    //             }
    //             if (provider.type) {
    //                 return this.container.resolve(provider.type, ...providers);
    //             }
    //             if (extensds && provider['files'] && provider['execution']) {
    //                 return extensds(provider);
    //             }

    //             return provider;
    //         }
    //     }

    //     if (isToken(param.type)) {
    //         return this.container.resolve(param.type, ...providers);
    //     }
    //     return undefined;
    // }
}
