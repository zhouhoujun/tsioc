import { Type } from '../types';
import { isFunction, getClass, isTypeObject, EMPTY, isClass } from '../utils/chk';
import { Token } from '../tokens';
import { get } from '../metadata/refl';
import { ParameterMetadata } from '../metadata/meta';
import { Injector, RegisteredState, ProviderType, MethodType } from '../injector';
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
    invoke<T, TR = any>(injector: Injector, target: Token<T> | T, propertyKey: MethodType<T>, providers?: ProviderType[]): TR {
        let targetClass: Type, instance: any, key: string;
        if (isTypeObject(target)) {
            targetClass = getClass(target);
            instance = target as T;
        } else {
            instance = injector.resolve(target as Token, providers);
            targetClass = getClass(instance);
            if (!targetClass) {
                throw new Error((target as Token).toString() + ' is not implements by any class.')
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

        const state = injector.state();
        providers = [...providers || EMPTY, state.getTypeProvider(targetClass), ...tgRefl.methodProviders.get(key) || EMPTY];
        const proxy = instance[key]['_proxy'];
        if (providers.length) {
            injector = Injector.create(providers, injector, proxy ? 'invoked' : 'provider');
        }
        const paramInstances = this.resolveParams(injector, state, tgRefl.methodParams.get(key) || EMPTY);
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
    createParams(injector: Injector, target: Type, propertyKey: string, providers?: ProviderType[]): any[] {
        const tgRefl = get(target);
        const state = injector.state();
        providers = [
            ...providers || EMPTY,
            state.getTypeProvider(target),
            ...tgRefl.methodProviders.get(propertyKey) || EMPTY];
        if (providers.length) {
            injector = Injector.create(providers, injector, 'provider');
        }
        const args = this.resolveParams(injector, state, tgRefl.methodParams.get(propertyKey) || EMPTY);
        if (providers.length) {
            injector.destroy();
        }
        return args;
    }

    protected resolveParams(injector: Injector, state: RegisteredState, params: ParameterMetadata[]): any[] {
        return params.map(param => this.tryGetPdrParamer(injector, state, param.provider)
            ?? this.tryGetNameParamer(injector, param.paramName)
            ?? this.tryGetPdrParamer(injector, state, param.type)
            ?? param.defaultValue);
    }

    protected tryGetPdrParamer(injector: Injector, state: RegisteredState, provider: Token | undefined) {
        if (!provider) return undefined;
        if (isClass(provider) && !state.isRegistered(provider) && !injector.has(provider, true)) {
            injector.register(provider);
        }
        return injector.get(provider);
    }

    protected tryGetNameParamer(injector: Injector, paramName: string | undefined) {
        return paramName && injector.has(paramName) ? injector.get(paramName) : undefined;
    }

}

