import { Type } from '../types';
import { isFunction, getClass, isTypeObject } from '../utils/chk';
import { Token } from '../tokens';
import { IInjector, IProvider, ProviderType, RegisteredState } from '../IInjector';
import { Invoker, MethodType } from '../Invoker';
import { get } from '../decor/refl';
import { ParameterMetadata } from '../decor/metadatas';
import { createInvokedProvider } from '../injector';

/**
 * method accessor
 *
 * @export
 * @class MethodAccessor
 * @implements {Invoker}
 */
export class InvokerImpl implements Invoker {

    constructor() { }

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
        let typepdr: IProvider;
        if (isTypeObject(target)) {
            targetClass = getClass(target);
            typepdr = injector.state().getTypeProvider(targetClass);
            instance = target as T;
        } else {
            targetClass = injector.getTokenProvider(target as Token);
            typepdr = injector.state().getTypeProvider(targetClass);
            instance = injector.get(target as Token, typepdr, ...providers);
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
        const pdr = proxy ? createInvokedProvider(injector, providers) : injector.toProvider(providers);
        const paramInstances = this.resolveParams(injector, tgRefl.methodParams.get(key) || [], pdr, typepdr);
        if (proxy && pdr) {
            paramInstances.push(pdr);
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
    createParams(injector: IInjector, target: Type, params: ParameterMetadata[], ...providers: ProviderType[]): any[] {
        return this.resolveParams(injector, params, injector.toProvider(providers), injector.state().getTypeProvider(target));
    }

    protected resolveParams(injector: IInjector, params: ParameterMetadata[], providers: IProvider, typepdrs?: IProvider): any[] {
        const state = injector.state();
        return params.map(param => this.tryGetPdrParamer(injector, state, param.provider, param.isProviderType, providers, typepdrs)
            ?? this.tryGetNameParamer(param.paramName, providers, typepdrs)
            ?? this.tryGetPdrParamer(injector, state, param.type, param.isType, providers, typepdrs)
            ?? param.defaultValue);
    }

    protected tryGetPdrParamer(injector: IInjector, state: RegisteredState, provider: Token, isType: boolean, providers?: IProvider, typepdrs?: IProvider) {
        if (!provider) return null;
        if (typepdrs && typepdrs.has(provider)) return typepdrs.get(provider, providers);
        if (providers?.has(provider)) return providers.get(provider, providers);
        if (isType && !state.isRegistered(provider as Type) && !injector.has(provider, true)) {
            injector.register(provider as Type);
        }
        return injector.get(provider, providers);
    }

    protected tryGetNameParamer(paramName: string, providers?: IProvider, typepdrs?: IProvider) {
        if (typepdrs && typepdrs.has(paramName)) return typepdrs.get(paramName, providers);
        if (providers && providers.has(paramName)) return providers.get(paramName, providers);
        return null;
    }

}
