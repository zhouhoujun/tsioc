import { Token, Type } from '../types';
import { IParameter } from '../IParameter';
import { lang, isFunction, isBaseType } from '../utils/lang';
import { isToken } from '../utils/isToken';
import { IIocContainer } from '../IIocContainer';
import { IMethodAccessor } from '../IMethodAccessor';
import { ActionRegisterer } from './ActionRegisterer';
import { ParamProviders } from '../providers/types';
import { ProviderParser } from '../providers/ProviderParser';
import { ProviderMap } from '../providers/ProviderMap';
import { RuntimeActionContext } from './runtime/RuntimeActionContext';
import { RuntimeParamScope } from './runtime/RuntimeParamScope';



const invokedPdrKey = '__invoked_prds_'
/**
 * method accessor
 *
 * @export
 * @class MethodAccessor
 * @implements {IMethodAccessor}
 */
export class MethodAccessor implements IMethodAccessor {

    constructor() {

    }

    /**
     * try to async invoke the method of intance, if no instance will create by type.
     *
     * @template T
     * @param {IIocContainer} container
     * @param {*} target
     * @param {(string | ((tag: T) => Function))} propertyKey
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    invoke<T, TR = any>(container: IIocContainer, target: Token<T> | T, propertyKey: string | ((tag: T) => Function), ...providers: ParamProviders[]): TR {
        let targetClass: Type;
        let instance: T;
        if (isToken(target)) {
            targetClass = container.getTokenProvider(target);
            instance = container.resolve(target, ...providers);
            lang.assert(targetClass, target.toString() + ' is not implements by any class.');
        } else {
            targetClass = lang.getClass(target);
            instance = target;
        }

        let reflects = container.getTypeReflects();
        let tgRefl = reflects.get(targetClass);
        let key: string;
        if (isFunction(propertyKey)) {
            let meth = propertyKey(instance);
            tgRefl.defines.extendTypes.forEach(t => {
                let dcp = Object.getOwnPropertyDescriptors(t.prototype);
                key = Object.keys(dcp).find(k => isFunction(dcp[k].value) && !(dcp[k].set || dcp[k].get) && instance[k] === meth);
                return !key;
            });
        } else {
            key = propertyKey;
        }

        lang.assertExp(instance && isFunction(instance[key]), `type: ${targetClass} has no method ${(key || '').toString()}.`);

        let pds = tgRefl.methodParamProviders.get(key) || [];
        providers = providers.concat(pds);
        let parameters = tgRefl.methodParams.has(key) ? tgRefl.methodParams.get(key) : this.getParameters(container, targetClass, instance, key);
        let providerMap = container.getInstance(ProviderParser).parse(...providers);
        let paramInstances = this.resolveParams(container, parameters, providerMap);
        instance[invokedPdrKey + key] = providerMap;
        return instance[key](...paramInstances) as TR;
    }

    /**
     * get target invoked provider.
     *
     * @param {*} target
     * @param {string} propertyKey
     * @returns {ProviderMap}
     * @memberof IMethodAccessor
     */
    invokedProvider(target: any, propertyKey: string): ProviderMap {
        return target ? target[invokedPdrKey + propertyKey] : null;
    }

    /**
     * create params instance.
     *
     * @param {IIocContainer} container
     * @param {IParameter[]} params
     * @param {...ParamProviders[]} providers
     * @returns {any[]}
     * @memberof MethodAccessor
     */
    createParams(container: IIocContainer, params: IParameter[], ...providers: ParamProviders[]): any[] {
        return this.resolveParams(container, params, container.getInstance(ProviderParser).parse(...providers));
    }

    protected resolveParams(container: IIocContainer, params: IParameter[], providerMap: ProviderMap): any[] {
        return params.map((param, index) => {
            if (param.provider && providerMap.has(param.provider)) {
                return providerMap.resolve(param.provider);
            } else if (param.name && providerMap.has(param.name)) {
                return providerMap.resolve(param.name);
            } else if (param.provider) {
                return container.resolve(param.provider, providerMap);
            } else if (isToken(param.type)) {
                if (providerMap.has(param.type)) {
                    return providerMap.resolve(param.type);
                }
                if (isFunction(param.type) && isBaseType(param.type)) {
                    return undefined;
                }
                return container.resolve(param.type, providerMap);
            } else {
                return undefined;
            }
        });
    }

    /**
     * get type class constructor parameters.
     *
     * @template T
     * @param {IIocContainer} container
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof MethodAccessor
     */
    getParameters<T>(container: IIocContainer, type: Type<T>): IParameter[];
    /**
     * get method parameters of type.
     *
     * @template T
     * @param {IIocContainer} container
     * @param {Type<T>} type
     * @param {T} instance
     * @param {string} propertyKey
     * @returns {IParameter[]}
     * @memberof MethodAccessor
     */
    getParameters<T>(container: IIocContainer, type: Type<T>, instance: T, propertyKey: string): IParameter[];
    getParameters<T>(container: IIocContainer, type: Type<T>, instance?: T, propertyKey?: string): IParameter[] {
        let ctx = RuntimeActionContext.parse({
            targetType: type,
            target: instance,
            propertyKey: propertyKey,
            raiseContainer: container.getFactory()
        });
        container.getInstance(ActionRegisterer).get(RuntimeParamScope).execute(ctx);
        let params = ctx.targetReflect.methodParams.get(propertyKey);
        return params || [];
    }
}
