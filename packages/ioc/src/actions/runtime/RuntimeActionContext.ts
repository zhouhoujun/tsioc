import { Type } from '../../types';
import { IParameter } from '../../IParameter';
import { ParamProviders, ProviderMap, ProviderParser } from '../../providers';
import { ContainerFactory } from '../../IIocContainer';
import { RegisterActionOption, RegisterActionContext } from '../RegisterActionContext';
import { createRaiseContext, CTX_PROVIDER_MAP } from '../Action';
import { InjectToken } from '../../InjectToken';


/**
 * register action option.
 *
 * @export
 * @interface RegisterActionOption
 */
export interface RuntimeActionOption extends RegisterActionOption {
    /**
     * the args.
     *
     * @type {any[]}
     * @memberof RuntimeActionContext
     */
    args?: any[];

    propertyKey?: string;
    /**
     * args params types.
     *
     * @type {IParameter[]}
     * @memberof RuntimeActionContext
     */
    params?: IParameter[];
    /**
     * target instance.
     *
     * @type {*}
     * @memberof RegisterActionContext
     */
    target?: any;
    /**
     * exter providers for resolve. origin providers
     *
     * @type {ParamProviders[]}
     * @memberof RegisterActionContext
     */
    providers?: ParamProviders[];
}

export const CTX_PARAMS = new InjectToken<IParameter[]>('CTX_PARAMS');
export const CTX_ARGS = new InjectToken<IParameter[]>('CTX_ARGS');
export const CTX_PROPERTYKEY = new InjectToken<string>('CTX_PROPERTYKEY');
/**
 * Ioc Register action context.
 *
 * @export
 * @class RuntimeActionContext
 * @extends {RegisterActionContext}
 */
export class RuntimeActionContext extends RegisterActionContext {
    /**
     * target instance.
     *
     * @type {*}
     * @memberof RuntimeActionContext
     */
    target?: any;

    constructor(targetType?: Type) {
        super(targetType);
    }

    get providerMap(): ProviderMap {
        let pdrm = this.getContext(CTX_PROVIDER_MAP);
        if (!pdrm) {
            pdrm = this.getRaiseContainer().getInstance(ProviderParser).parse(...this.providers);
            this.setContext(CTX_PROVIDER_MAP, pdrm);
        }
        return pdrm;
    }

    get propertyKey() {
        return this.getContext(CTX_PROPERTYKEY) || 'constructor';
    }

    /**
     * create register context.
     *
     * @static
     * @param {RuntimeActionOption} options
     * @param {ContainerFactory} [raiseContainer]
     * @returns {RegisterActionContext}
     * @memberof RegisterActionContext
     */
    static parse(target: Type | RuntimeActionOption, raiseContainer?: ContainerFactory): RuntimeActionContext {
        return createRaiseContext(RuntimeActionContext, target, raiseContainer);
    }

    setOptions(options: RuntimeActionOption) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.propertyKey) {
            this.setContext(CTX_PROPERTYKEY, options.propertyKey);
        }
        if (options.args) {
            this.setContext(CTX_ARGS, options.args);
        }
        if (options.params) {
            this.setContext(CTX_PARAMS, options.params);
        }
    }
}
