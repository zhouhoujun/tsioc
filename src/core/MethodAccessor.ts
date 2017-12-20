import { IContainer } from '../IContainer';
import { ParamProvider, AsyncParamProvider } from '../ParamProvider';
import { IMethodAccessor } from '../IMethodAccessor';
import { Type } from '../Type';
import { isFunction, isUndefined, isString } from 'util';
import { BindParameterProviderActionData, CoreActions } from './actions';
import { symbols, isToken } from '../utils';
import { Token } from '../types';
import { Container } from '../Container';
import { IContainerBuilder } from '../IContainerBuilder';
import { IParameter } from '../IParameter';
import { DecoratorType } from './factories';

export class MethodAccessor implements IMethodAccessor {

    constructor(private container: IContainer) {

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

            let paramInstances = await this.createParams(parameters, ...providers);

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
            let paramInstances = this.createSyncParams(parameters, ...providers);

            return target[propertyKey](...paramInstances) as T;
        } else {
            throw new Error(`type: ${targetType} has no method ${propertyKey}.`)
        }
    }

    createSyncParams(params: IParameter[], ...providers: ParamProvider[]): any[] {
        return params.map((param, index) => {
            return this.createParam(param, index, providers);
        });
    }

    createParams(params: IParameter[], ...providers: AsyncParamProvider[]): Promise<any[]> {
        return Promise.all(params.map(async (param, index) => {

            return this.createParam(param, index, providers, async (provider: AsyncParamProvider) => {

                let buider = this.container.get<IContainerBuilder>(symbols.IContainerBuilder);
                let modules = await buider.loadModule(this.container, {
                    files: provider.files
                });
                let params = await Promise.all(modules.map((mdl) => {
                    return this.container.invoke<any>(mdl, provider.execution)
                }));

                return modules.length === 1 ? params[0] : params;
            });
        }));
    }

    protected createParam(param: IParameter, index: number, providers: ParamProvider[], extensds?: (provider: ParamProvider) => any) {
        if (providers.length) {
            let provider = providers.find(p => p && (isString(p.index) ? p.index === param.name : p.index === index));
            if (provider) {
                if (!isUndefined(provider.value)) {
                    return isFunction(provider.value) ? provider.value(this.container) : provider.value;
                }
                if (provider.type) {
                    return this.container.get(provider.type);
                }
                if (extensds && provider['files'] && provider['execution']) {
                    return extensds(provider);
                }
            }
        }
        return this.container.get(param.type);
    }
}
