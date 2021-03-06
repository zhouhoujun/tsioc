import { Type } from '../types';
import { lang, isFunction, isBaseType } from '../utils/lang';
import { Token, isToken, Provider } from '../tokens';
import { IInjector, IProvider } from '../IInjector';
import { IParameter, IMethodAccessor, MethodType } from '../IMethodAccessor';
import { RuntimeContext, RuntimeParamScope } from './run-act';
import { INVOKED_PROVIDERS, TypeReflectsToken } from '../utils/tk';


/**
 * method accessor
 *
 * @export
 * @class MethodAccessor
 * @implements {IMethodAccessor}
 */
export class MethodAccessor implements IMethodAccessor {

    constructor() {}

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

        let reflects = injector.getValue(TypeReflectsToken);
        let tgRefl = reflects.get(targetClass);
        let key: string;
        if (isFunction(propertyKey)) {
            let descriptors = tgRefl.defines.getPropertyDescriptors();
            key = tgRefl.defines.getPropertyName(propertyKey(descriptors as any) as TypedPropertyDescriptor<any>);
        } else {
            key = propertyKey;
        }

        if (!instance || !isFunction(instance[key])) {
            throw new Error(`type: ${targetClass} has no method ${(key || '').toString()}.`);
        }

        let pds = tgRefl.methodParamProviders.get(key) || [];
        providers = providers.concat(pds);
        let parameters = tgRefl.methodParams.has(key) ? tgRefl.methodParams.get(key) : this.getParameters(injector, targetClass, instance, key);
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
    createParams(injector: IInjector, params: IParameter[], ...providers: Provider[]): any[] {
        return this.resolveParams(injector, params, injector.getInstance(INVOKED_PROVIDERS).inject(...providers));
    }

    protected resolveParams(injector: IInjector, params: IParameter[], providers: IProvider): any[] {
        return params.map((param, index) => {
            if (param.provider && providers.has(param.provider)) {
                return providers.get(param.provider);
            } else if (param.name && providers.has(param.name)) {
                return providers.get(param.name);
            } else if (param.provider) {
                return injector.get(param.provider, providers);
            } else if (isToken(param.type)) {
                if (providers.has(param.type)) {
                    return providers.get(param.type);
                }
                if (isFunction(param.type) && isBaseType(param.type)) {
                    return undefined;
                }
                return injector.get(param.type, providers);
            } else {
                return undefined;
            }
        });
    }

    /**
     * get type class constructor parameters.
     *
     * @template T
     * @param {IInjector} container
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof MethodAccessor
     */
    getParameters<T>(container: IInjector, type: Type<T>): IParameter[];
    /**
     * get method parameters of type.
     *
     * @template T
     * @param {IInjector} injector
     * @param {Type<T>} type
     * @param {T} instance
     * @param {string} propertyKey
     * @returns {IParameter[]}
     * @memberof MethodAccessor
     */
    getParameters<T>(injector: IInjector, type: Type<T>, instance: T, propertyKey: string): IParameter[];
    getParameters<T>(injector: IInjector, type: Type<T>, instance?: T, propertyKey?: string): IParameter[] {
        let ctx = {
            injector,
            type,
            instance,
            propertyKey
        } as RuntimeContext;
        injector.getContainer().getActionInjector().getInstance(RuntimeParamScope).execute(ctx);
        let params = ctx.targetReflect.methodParams.get(propertyKey);
        return params || [];
    }
}
