import { ActionContextOption, Type, Modules, IocRaiseContext, createRaiseContext, CTX_CURR_DECOR, IInjector } from '@tsdi/ioc';
import { CTX_INJ_MODULE } from '../context-tokens';


/**
 * Injector action option.
 *
 * @export
 * @interface InjectorActionOption
 */
export interface InjectActionOption extends ActionContextOption {
    module: Modules;
}

/**
 * Ioc Injector action context.
 *
 * @export
 * @class InjectorActionContext
 * @extends {IocActionContext}
 */
export class InjectActionContext extends IocRaiseContext<InjectActionOption> {

    /**
     * the module to injector to container.
     *
     * @type {Modules}
     * @memberof InjectorActionContext
     */
    get module(): Modules {
        return this.getValue(CTX_INJ_MODULE);
    }

    get currDecoractor(): string {
        return this.getValue(CTX_CURR_DECOR);
    }

    /**
     * types in  module.
     *
     * @type {Type[]}
     * @memberof InjectorActionContext
     */
    types: Type[];

    /**
     * registered types.
     *
     * @type {Type[]}
     * @memberof InjectorActionContext
     */
    registered: Type[];

    /**
     * injector action context.
     *
     * @static
     * @param { IInjector } injecor
     * @param {InjectActionOption} options
     * @returns {InjectActionContext}
     * @memberof InjectorActionContext
     */
    static parse(injector: IInjector, options: InjectActionOption): InjectActionContext {
        return createRaiseContext(injector, InjectActionContext, options);
    }

    setOptions(options: InjectActionOption) {
        if (!options) {
            return;
        }
        if (options.module) {
            this.context.registerValue(CTX_INJ_MODULE, options.module);
        }
    }
}
