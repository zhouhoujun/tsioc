import { Type } from '../types';
import { isFunction, getClass, isTypeObject, isArray } from '../utils/chk';
import { Token } from '../tokens';
import { get } from '../metadata/refl';
import { ParameterMetadata } from '../metadata/meta';
import { EMPTY, Injector, RegisteredState, ProviderType, MethodType } from '../injector';
import { Invoker } from '../invoker';


/**
 * method accessor
 *
 * @export
 * @class MethodAccessor
 * @implements {Invoker}
 */
export class InvokerImpl implements Invoker {

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {Injector} injector
     * @param {*} target
     * @param {(string | ((tag: T) => Function))} propertyKey
     * @param {ProviderType[]} providers
     * @returns {T}
     */
    invoke<T, TR = any>(injector: Injector, target: Token<T> | T, propertyKey: MethodType<T>, providers: ProviderType[]): TR;
    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {Injector} injector
     * @param {*} target
     * @param {(string | ((tag: T) => Function))} propertyKey
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    invoke<T, TR = any>(injector: Injector, target: Token<T> | T, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR;
    invoke<T, TR = any>(injector: Injector, target: Token<T> | T, propertyKey: MethodType<T>, ...args: any[]): TR {
        let providers: ProviderType[] = (args.length === 1 && isArray(args[0])) ? args[0] : args;
        let targetClass: Type, instance: T, key: string;
        if (isTypeObject(target)) {
            targetClass = getClass(target);
            instance = target as T;
        } else {
            instance = injector.resolve(target as Token, providers);
            targetClass = getClass(instance);
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

        const mpdrs = tgRefl.methodProviders.get(key);
        providers = [...providers || EMPTY, ...tgRefl.providers || EMPTY, ...mpdrs || EMPTY];

        const proxy = instance[key]['_proxy'];
        if (providers.length) {
            injector = Injector.create(providers, injector, proxy ? 'invoked' : 'provider');
        }

        const paramInstances = this.resolveParams(injector, tgRefl.methodParams.get(key) || EMPTY);
        if (proxy) {
            paramInstances.push(injector);
        } else if (providers.length) {
            injector.destroy();
        }
        return instance[key](...paramInstances) as TR;
    }

    /**
     * create params instance.
     * @param injector 
     * @param target 
     * @param propertyKey 
     * @param providers 
     * @returns 
     */
    createParams(injector: Injector, target: Type, propertyKey: string, providers: ProviderType[]): any[];
    /**
     * create params instance.
     * @param injector 
     * @param target 
     * @param propertyKey 
     * @param providers 
     * @returns 
     */
    createParams(injector: Injector, target: Type, propertyKey: string, ...providers: ProviderType[]): any[];
    createParams(injector: Injector, target: Type, propertyKey: string, ...prds: any[]): any[] {
        const tgRefl = get(target);
        let providers: ProviderType[] = [
            ...(prds.length === 1 && isArray(prds[0])) ? prds[0] : prds,
            ...tgRefl?.providers || EMPTY,
            ...tgRefl.methodProviders.get(propertyKey) || EMPTY];
        if (providers.length) {
            injector = Injector.create(providers, injector);
        }
        const args = this.resolveParams(injector, tgRefl.methodParams.get(propertyKey) || EMPTY);
        if (providers.length) {
            injector.destroy();
        }
        return args;
    }

    protected resolveParams(injector: Injector, params: ParameterMetadata[]): any[] {
        const state = injector.state();
        return params.map(param => this.tryGetPdrParamer(injector, state, param.provider, param.isProviderType)
            ?? this.tryGetNameParamer(injector, param.paramName)
            ?? this.tryGetPdrParamer(injector, state, param.type, param.isType)
            ?? param.defaultValue);
    }

    protected tryGetPdrParamer(injector: Injector, state: RegisteredState, provider: Token, isType: boolean) {
        if (!provider) return undefined;
        if (isType && !state.isRegistered(provider as Type) && !injector.has(provider, true)) {
            injector.register(provider as Type);
        }
        return injector.get(provider) ?? undefined;
    }

    protected tryGetNameParamer(injector: Injector, paramName: string) {
        return injector.has(paramName) ? injector.get(paramName) : undefined;
    }

}
