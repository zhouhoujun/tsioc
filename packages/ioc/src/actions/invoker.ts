import { Type } from '../types';
import { isFunction, getClass, isTypeObject } from '../utils/chk';
import { Token } from '../tokens';
import { IInjector, ProviderType, RegisteredState, Invoker, MethodType } from '../interface';
import { get } from '../metadata/refl';
import { ParameterMetadata } from '../metadata/meta';
import { EMPTY, Injector } from '../injector';


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
     * @param {IInjector} injector
     * @param {*} target
     * @param {(string | ((tag: T) => Function))} propertyKey
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    invoke<T, TR = any>(injector: IInjector, target: Token<T> | T, propertyKey: MethodType<T>, ...providers: ProviderType[]): TR {
        if (providers.length) {
            injector = Injector.create(providers, injector);
        }
        let targetClass: Type, instance: T, key: string;
        if (isTypeObject(target)) {
            targetClass = getClass(target);
            instance = target as T;
        } else {
            instance = injector.resolve(target as Token);
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

        const mpdrs = tgRefl.methodProviders.get(key) || EMPTY;
        let isNewInj = providers.length || tgRefl.providers.length || mpdrs.length;

        if (isNewInj) {
            injector = Injector.create([...providers, ...tgRefl.providers, ...mpdrs], injector);
        }

        const proxy = instance[key]['_proxy'];
        const paramInstances = this.resolveParams(injector, tgRefl.methodParams.get(key) || EMPTY);
        if (proxy) {
            paramInstances.push(injector);
        } else if (isNewInj) {
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
    createParams(injector: IInjector, target: Type, propertyKey: string, ...providers: ProviderType[]): any[] {
        const tgRefl = get(target);
        const typdrs =tgRefl?.providers || EMPTY;
        const mthpdrs = tgRefl.methodProviders.get(propertyKey) || EMPTY;
        const isNew = providers.length || typdrs.length || mthpdrs.length;
        if (isNew) {
            injector = Injector.create([...providers, ...typdrs, ...mthpdrs], injector);
        }
        const args = this.resolveParams(injector, tgRefl.methodParams.get(propertyKey));
        if (isNew) {
            injector.destroy();
        }
        return args;
    }

    protected resolveParams(injector: IInjector, params: ParameterMetadata[]): any[] {
        const state = injector.state();
        return params.map(param => this.tryGetPdrParamer(injector, state, param.provider, param.isProviderType)
            ?? this.tryGetNameParamer(injector, param.paramName)
            ?? this.tryGetPdrParamer(injector, state, param.type, param.isType)
            ?? param.defaultValue);
    }

    protected tryGetPdrParamer(injector: IInjector, state: RegisteredState, provider: Token, isType: boolean) {
        if (!provider) return undefined;
        if (isType && !state.isRegistered(provider as Type) && !injector.has(provider, true)) {
            injector.register(provider as Type);
        }
        return injector.get(provider) ?? undefined;
    }

    protected tryGetNameParamer(injector: IInjector, paramName: string) {
        return injector.has(paramName) ? injector.get(paramName) : undefined;
    }

}
