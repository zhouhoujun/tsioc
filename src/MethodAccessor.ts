import { IContainer } from './IContainer';
import { ParamProvider, AsyncParamProvider } from './ParamProvider';
import { IMethodAccessor } from './IMethodAccessor';
import { Type } from './Type';
import { isFunction, isUndefined, isString } from 'util';
import { Singleton, Inject, MethodMetadata, BindParameterProviderActionData, ActionComponent, CoreActions, DecoratorType } from './core';
import { symbols } from './utils';
import { isToken, Token, getMethodMetadata, IParameter } from './index';
import { Container } from './Container';
import { IContainerBuilder } from './IContainerBuilder';
import { match } from 'minimatch';

@Singleton(symbols.IMethodAccessor)
export class MethodAccessor implements IMethodAccessor {



    constructor( @Inject(symbols.IContainer) private container: IContainer) {

    }

    async invoke<T>(targetType: Type<any>, propertyKey: string | symbol, target?: any, ...providers: AsyncParamProvider[]): Promise<T> {
        target = target || this.container.get(targetType);
        if (target && isFunction(target[propertyKey])) {
            let actionData = {
                target: target,
                targetType: targetType,
                propertyKey: propertyKey,
            } as BindParameterProviderActionData;
            let lifeScope = this.container.getLifeScope();
            lifeScope.execute(DecoratorType.Parameter, actionData, CoreActions.bindParameterProviders);
            providers = providers.concat(actionData.execResult);

            let parameters = lifeScope.getMethodParameters(targetType, target, propertyKey);
            let paramInstances = await Promise.all(parameters.map(async (param, index) => {

                return this.createParamProvder(param, index, providers, async (provider: AsyncParamProvider) => {

                    let buider = this.container.get<IContainerBuilder>(symbols.IContainerBuilder);
                    let modules = await buider.loadModule(this.container, {
                        files: provider.files
                    });
                    let params = modules.map(async (mdl) => {
                        return this.container.invoke(mdl, provider.execution)
                    });

                    return modules.length === 1 ? params[0] : params;
                });
            }));

            return target[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${targetType} has no method ${propertyKey}.`)
        }
    }

    syncInvoke<T>(targetType: Type<any>, propertyKey: string | symbol, target?: any, ...providers: ParamProvider[]): T {
        target = target || this.container.get(targetType);
        if (target && isFunction(target[propertyKey])) {
            let actionData = {
                target: target,
                targetType: targetType,
                propertyKey: propertyKey,
            } as BindParameterProviderActionData;
            let lifeScope = this.container.getLifeScope();
            lifeScope.execute(DecoratorType.Parameter, actionData, CoreActions.bindParameterProviders);


            providers = providers.concat(actionData.execResult);
            let parameters = lifeScope.getMethodParameters(targetType, target, propertyKey);
            let paramInstances = parameters.map((param, index) => {
                return this.createParamProvder(param, index, providers);
            });

            return target[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${targetType} has no method ${propertyKey}.`)
        }
    }

    createParamProvder(param: IParameter, index: number, providers: ParamProvider[], extensds?: (provider: ParamProvider) => any) {
        let provider: ParamProvider = null;
        if (providers.length) {
            provider = providers.find(p => p && (isString(p.index) ? p.index === param.name : p.index === index));
        }
        if (provider) {
            if (!isUndefined(provider.value)) {
                return isFunction(provider.value) ? provider.value(this.container) : provider.value;
            }
            if (provider.type) {
                this.container.get(provider.type);
            }
            if (extensds && provider['files'] && provider['execution']) {
                return extensds(provider);
            }
        }
        return this.container.get(param.type);
    }
}
