import { Type } from '../types';
import { isFunction, getClass, isTypeObject } from '../utils/chk';
import { Token, ProviderType } from '../tokens';
import { IInjector, IProvider } from '../IInjector';
import { IMethodAccessor, MethodType } from '../IMethodAccessor';
import { INVOKED_PROVIDERS } from '../utils/tk';
import { get } from '../decor/refl';
import { ParameterMetadata } from '../decor/metadatas';
import { IContainer } from '../IContainer';
import { getProvider } from '../injector';


/**
 * method accessor
 *
 * @export
 * @class MethodAccessor
 * @implements {IMethodAccessor}
 */
export class MethodAccessor implements IMethodAccessor {

    constructor(private container: IContainer) { }

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {IInjector} injector
     * @param {*} target
     * @param {(string | ((tag: T) => Function))} propertyKey
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    invoke<T, TR = any>(injector: IInjector, target: Token<T> | T, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR {
        let targetClass: Type, instance: T, key: string;
        if (isTypeObject(target)) {
            targetClass = getClass(target);
            instance = target as T;
        } else {
            targetClass = injector.getTokenProvider(target as Token);
            instance = injector.get(target as Token, ...providers);
            if (!targetClass) {
                throw new Error(target.toString() + ' is not implements by any class.')
            }
        }

        const tgRefl = get(targetClass);
        if (isFunction(propertyKey)) {
            key = tgRefl.class.getPropertyName(propertyKey(tgRefl.class.getPropertyDescriptors() as any) as TypedPropertyDescriptor<any>);
        } else {
            key = propertyKey;
        }

        if (!instance || !isFunction(instance[key])) {
            throw new Error(`type: ${targetClass} has no method ${(key || '').toString()}.`);
        }

        if (tgRefl.methodExtProviders.has(key)) {
            providers = providers.concat(tgRefl.methodExtProviders.get(key));
        }

        const proxy = instance[key]['_proxy'];
        const pdr = proxy ? this.container.getInstance(INVOKED_PROVIDERS).inject(...providers) : getProvider(injector, ...providers)
        const paramInstances = this.resolveParams(injector, tgRefl.methodParams.get(key) || [], pdr);
        if (proxy) {
            if (pdr.size) {
                paramInstances.push(pdr);
            } else {
                pdr.destroy();
            }
        }
        return instance[key](...paramInstances) as TR;
    }

    /**
     * create params instance.
     *
     * @param {IInjector} injector
     * @param {IParameter[]} params
     * @param {...ProviderType[]} providers
     * @returns {any[]}
     */
    createParams(injector: IInjector, params: ParameterMetadata[], ...providers: ProviderType[]): any[] {
        return this.resolveParams(injector, params, getProvider(injector, ...providers));
    }

    protected resolveParams(injector: IInjector, params: ParameterMetadata[], providers: IProvider): any[] {
        return params.map((param, index) => {
            if (param.provider) {
                if (providers.has(param.provider)) return providers.get(param.provider, providers);
                if (param.isProviderType && !this.container.regedState.isRegistered(param.provider as Type) && !injector.has(param.type, true)) {
                    injector.registerType(param.provider as Type);
                }
                return injector.get(param.provider, providers) ?? param.defaultValue;
            } else if (param.paramName && providers.has(param.paramName)) {
                return providers.get(param.paramName, providers);
            } else if (param.type) {
                if (providers.has(param.type)) return providers.get(param.type, providers);
                if (param.isType && !this.container.regedState.isRegistered(param.type) && !injector.has(param.type, true)) {
                    injector.registerType(param.type as Type);
                }
                return injector.get(param.type, providers) ?? param.defaultValue;
            } else {
                return param.defaultValue;
            }
        });
    }
}
