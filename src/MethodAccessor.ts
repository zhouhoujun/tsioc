import { IContainer } from './IContainer';
import { ParamProvider, AsyncParamProvider } from './ParamProvider';
import { IMethodAccessor } from './IMethodAccessor';
import { Type } from './Type';
import { isFunction, isUndefined } from 'util';
import { Singleton, Inject, MethodMetadata, BindParameterProviderActionData, ActionComponent, CoreActions, DecoratorType } from './core';
import { symbols } from './utils';
import { isToken, Token } from './index';
import { Container } from './Container';
import { IContainerBuilder } from './IContainerBuilder';

@Singleton(symbols.IMethodAccessor)
export class MethodAccessor implements IMethodAccessor {



    constructor( @Inject(symbols.IContainer) private container: IContainer) {

    }

    async invoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: AsyncParamProvider[]): Promise<T> {
        instance = instance || this.container.get(type);
        if (instance && isFunction(instance[propertyKey])) {
            let actionData = {
                target: instance,
                targetType: type,
                propertyKey: propertyKey,
            } as BindParameterProviderActionData;
            let lifeScope = this.container.getLifeScope();
            lifeScope.execute(DecoratorType.Parameter, actionData, CoreActions.bindParameterProviders);
            providers = providers.concat(actionData.execResult);

            let parameters = lifeScope.getMethodParameters(type, instance, propertyKey);
            let paramInstances = await Promise.all(parameters.map(async (type, index) => {
                let provider: AsyncParamProvider = null;
                if (providers.length) {
                    provider = providers.find(p => p && p.index === index)
                }
                if (provider) {
                    if (!isUndefined(provider.value)) {
                        return isFunction(provider.value) ? provider.value(this.container) : provider.value;
                    }
                    if (provider.type) {
                        this.container.get(provider.type);
                    }
                    if (provider.execution && provider.files) {

                        let buider = this.container.get<IContainerBuilder>(symbols.IContainerBuilder);
                        let modules = await buider.loadModule(this.container, {
                            files: provider.files
                        });
                        let params = modules.map(async (mdl) => {
                            return this.container.invoke(mdl, provider.execution)
                        });

                        return modules.length === 1 ? params[0] : params;


                    }
                }
                return this.container.get(type);
            }));

            return instance[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${type} has no method ${propertyKey}.`)
        }
    }

    syncInvoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: ParamProvider[]): T {
        instance = instance || this.container.get(type);
        if (instance && isFunction(instance[propertyKey])) {
            let actionData = {
                target: instance,
                targetType: type,
                propertyKey: propertyKey,
            } as BindParameterProviderActionData;
            let lifeScope = this.container.getLifeScope();
            lifeScope.execute(DecoratorType.Parameter, actionData, CoreActions.bindParameterProviders);


            providers = providers.concat(actionData.execResult);
            let parameters = lifeScope.getMethodParameters(type, instance, propertyKey);
            let paramInstances = parameters.map((type, index) => {
                let provider: ParamProvider = null;
                if (providers.length) {
                    provider = providers.find(p => p && p.index === index)
                }
                if (provider) {
                    if (!isUndefined(provider.value)) {
                        return isFunction(provider.value) ? provider.value(this.container) : provider.value;
                    }
                    if (provider.type) {
                        this.container.get(provider.type);
                    }
                }
                return this.container.get(type);
            });

            return instance[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${type} has no method ${propertyKey}.`)
        }
    }
}
