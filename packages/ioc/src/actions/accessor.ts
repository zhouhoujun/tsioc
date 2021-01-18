import { Type } from '../types';
import { isFunction, isBaseType, getClass } from '../utils/chk';
import { Token, isToken, ProviderType } from '../tokens';
import { IInjector, IProvider } from '../IInjector';
import { IMethodAccessor, MethodType } from '../IMethodAccessor';
import { INVOKED_PROVIDERS } from '../utils/tk';
import { get } from '../decor/refl';
import { ParameterMetadata } from '../decor/metadatas';
import { IContainer } from '../IContainer';


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
        let targetClass: Type;
        let instance: T;
        if (isToken(target)) {
            targetClass = injector.getTokenProvider(target);
            instance = injector.get(target, ...providers);
            if (!targetClass) {
                throw new Error(target.toString() + ' is not implements by any class.')
            }
        } else {
            targetClass = getClass(target);
            instance = target;
        }

        let tgRefl = get(targetClass);
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

        let pds = tgRefl.methodExtProviders.get(key);
        if (pds) {
            providers = providers.concat(pds);
        }
        let parameters = tgRefl.methodParams.get(key) || [];
        let providerMap = this.container.getInstance(INVOKED_PROVIDERS).inject(...providers);
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
     * @param {...ProviderType[]} providers
     * @returns {any[]}
     */
    createParams(injector: IInjector, params: ParameterMetadata[], ...providers: ProviderType[]): any[] {
        return this.resolveParams(injector, params, this.container.getInstance(INVOKED_PROVIDERS).inject(...providers));
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
