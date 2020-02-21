import { IParameter } from '../../IParameter';
import { RegisterActionOption, RegisterActionContext } from '../RegisterActionContext';
import { createRaiseContext } from '../IocActionContext';
import { CTX_ARGS, CTX_PARAMS, CTX_PROPERTYKEY } from '../../context-tokens';
import { ParamProviders } from '../../providers/types';
import { IInjector } from '../../IInjector';


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
 * @export
 * @class RuntimeActionContext
 * @extends {RegisterActionContext}
 */
export class RuntimeActionContext extends RegisterActionContext<RuntimeActionOption> {
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
     * @param {RuntimeActionOption} options
     * @returns {RegisterActionContext}
     * @memberof RegisterActionContext
     */
    static parse(injector: IInjector, options: RuntimeActionOption): RuntimeActionContext {
        return createRaiseContext(injector, RuntimeActionContext, options);
    }

    setOptions(options: RuntimeActionOption) {
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
