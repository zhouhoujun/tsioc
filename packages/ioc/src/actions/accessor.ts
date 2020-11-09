import { Type } from '../types';
import { lang, isFunction, isBaseType } from '../utils/lang';
import { Token, isToken, Provider } from '../tokens';
import { IInjector, IProvider } from '../IInjector';
import { IMethodAccessor, MethodType } from '../IMethodAccessor';
import { INVOKED_PROVIDERS } from '../utils/tk';
import { refl } from '../decor/reflects';
import { ParameterMetadata } from '../decor/metadatas';


/**
 * method accessor
 *
 * @export
 * @class MethodAccessor
 * @implements {IMethodAccessor}
 */
export class MethodAccessor implements IMethodAccessor {

    constructor() { }

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {IInjector} injector
     * @param {*} target
     * @param {(string | ((tag: T) => Function))} propertyKey
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    invoke<T, TR = any>(injector: IInjector, target: Token<T> | T, propertyKey: MethodType<T>, ...providers: Provider[]): TR {
        let targetClass: Type;
        let instance: T;
        if (isToken(target)) {
            targetClass = injector.getTokenProvider(target);
            instance = injector.get(target, ...providers);
            if (!targetClass) {
                throw new Error(target.toString() + ' is not implements by any class.')
            }
        } else {
            targetClass = lang.getClass(target);
            instance = target;
        }

        let tgRefl = refl.get(targetClass);
        let key: string;
        if (isFunction(propertyKey)) {
            let descriptors = tgRefl.class.getPropertyDescriptors();
            key = tgRefl.class.getPropertyName(propertyKey(descriptors as any) as TypedPropertyDescriptor<any>);
        } else {
            key = propertyKey;
        }

        if (!instance || !isFunction(instance[key])) {
            throw new Error(`type: ${targetClass} has no method ${(key || '').toString()}.`);
        }

        let pds = tgRefl.methodExtProviders.get(key) || [];
        providers = providers.concat(pds);
        let parameters = tgRefl.methodParams.get(key) || [];
        let providerMap = injector.getInstance(INVOKED_PROVIDERS).inject(...providers);
        let paramInstances = this.resolveParams(injector, parameters, providerMap);
        if (providerMap.size && instance[key]['_proxy']) {
            paramInstances.push(providerMap);
        } else {
            providerMap.destroy();
        }
        return instance[key](...paramInstances) as TR;
    }

    /**
     * create params instance.
     *
     * @param {IInjector} injector
     * @param {IParameter[]} params
     * @param {...Provider[]} providers
     * @returns {any[]}
     * @memberof MethodAccessor
     */
    createParams(injector: IInjector, params: ParameterMetadata[], ...providers: Provider[]): any[] {
        return this.resolveParams(injector, params, injector.getInstance(INVOKED_PROVIDERS).inject(...providers));
    }

    protected resolveParams(injector: IInjector, params: ParameterMetadata[], providers: IProvider): any[] {
        return params.map((param, index) => {
            if (param.provider && providers.has(param.provider)) {
                return providers.get(param.provider, param.alias);
            } else if (param.paramName && providers.has(param.paramName)) {
                return providers.get(param.paramName, param.alias);
            } else if (param.provider) {
                return injector.get(param.provider, param.alias, providers);
            } else if (isToken(param.type)) {
                if (providers.has(param.type)) {
                    return providers.get(param.type);
                }
                if (isBaseType(param.type)) {
                    return param.defaultValue;
                }
                return injector.get(param.type, providers);
            } else {
                return param.defaultValue;
            }
        });
    }
}
