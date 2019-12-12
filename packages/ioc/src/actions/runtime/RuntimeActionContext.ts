import { IParameter } from '../../IParameter';
import { RegisterActionOption, RegisterActionContext } from '../RegisterActionContext';
import { createRaiseContext } from '../IocAction';
import { CTX_ARGS, CTX_PARAMS } from '../../context-tokens';
import { ParamProviders } from '../../providers/types';
import { ContainerFactory } from '../../IIocContainer';


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
        return this.getOptions().propertyKey || 'constructor';
    }

    /**
     * create register context.
     *
     * @static
     * @param {RuntimeActionOption} options
     * @returns {RegisterActionContext}
     * @memberof RegisterActionContext
     */
    static parse(options: RuntimeActionOption, containerFactory: ContainerFactory): RuntimeActionContext {
        return createRaiseContext(RuntimeActionContext, options, containerFactory);
    }

    setOptions(options: RuntimeActionOption) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.target) {
            this.target = options.target;
        }
        if (options.args) {
            this.set(CTX_ARGS, options.args);
        }
        if (options.params) {
            this.set(CTX_PARAMS, options.params);
        }
    }
}
