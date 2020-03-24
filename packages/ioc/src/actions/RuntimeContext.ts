import { IParameter } from '../IParameter';
import { RegOption, RegContext } from './RegContext';
import { createContext } from './IocActionContext';
import { CTX_ARGS, CTX_PARAMS, CTX_PROPERTYKEY } from '../context-tokens';
import { ParamProviders } from '../providers/types';
import { IInjector } from '../IInjector';


/**
 *  runtime action option.
 *
 */
export interface RuntimeOption extends RegOption {
    /**
     * the args.
     *
     * @type {any[]}
     * @memberof RuntimeActionContext
     */
    args?: any[];

    /**
     * property key.
     */
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


/**
 * Ioc Register action context.
 *
 * @extends {RegContext}
 */
export class RuntimeContext extends RegContext<RuntimeOption> {
    /**
     * target instance.
     *
     * @type {*}
     * @memberof RuntimeActionContext
     */
    target?: any;

    get propertyKey() {
        return this.getValue(CTX_PROPERTYKEY);
    }

    /**
     * create register context.
     *
     * @static
     * @param {IInjector} injector
     * @param {RuntimeOption} options
     * @returns {RegContext}
     * @memberof RegisterActionContext
     */
    static parse(injector: IInjector, options: RuntimeOption): RuntimeContext {
        return createContext(injector, RuntimeContext, options);
    }

    setOptions(options: RuntimeOption) {
        if (!options) {
            return this;
        }
        if (options.target) {
            this.target = options.target;
        }
        if (options.args) {
            this.context.setValue(CTX_ARGS, options.args);
        }
        if (options.params) {
            this.context.setValue(CTX_PARAMS, options.params);
        }
        this.context.setValue(CTX_PROPERTYKEY, options.propertyKey || 'constructor');
        return super.setOptions(options);
    }
}
