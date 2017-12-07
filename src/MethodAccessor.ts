import { IContainer } from './IContainer';
import { ParamProvider, AsyncParamProvider } from './ParamProvider';
import { IMethodAccessor } from './IMethodAccessor';
import { Type } from './Type';
import { isFunction, isUndefined } from 'util';
import { Singleton, Inject } from './decorators/index';
import { symbols } from './utils';
import { isToken, Token } from './index';
import { Container } from './Container';
import { IContainerBuilder } from './IContainerBuilder';
import { MethodMetadata } from './metadatas/index';
import { AccessMethodData, ActionType, ActionComponent } from './actions/index';

@Singleton(symbols.IMethodAccessor)
export class MethodAccessor implements IMethodAccessor {



    constructor( @Inject(symbols.IContainer) private container: IContainer) {

    }

    async invoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: AsyncParamProvider[]): Promise<T> {
        instance = instance || this.container.get(type);
        if (instance && isFunction(instance[propertyKey])) {
            let accessorData = {
                propertyKey: propertyKey,
                providers: []
            } as AccessMethodData;
            this.container.get<Map<string, ActionComponent>>(symbols.MethodDecoratorMap).forEach((act, key) => {
                accessorData.methodMetadata = Reflect.getMetadata(key, type);
                act.execute(this.container, accessorData, ActionType.bindMethod);
            });

            providers = providers.concat(accessorData.providers as AsyncParamProvider[]);
            let parameters = this.container.getMethodParameters(type, instance, propertyKey);
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
            let accessorData = {
                propertyKey: propertyKey,
                providers: []
            } as AccessMethodData;
            this.container.get<Map<string, ActionComponent>>(symbols.MethodDecoratorMap).forEach((act, key) => {
                accessorData.methodMetadata = Reflect.getMetadata(key, type);
                act.execute(this.container, accessorData, ActionType.bindParameterProviders);
            });

            providers = providers.concat(accessorData.providers);
            let parameters = this.container.getMethodParameters(type, instance, propertyKey);
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
