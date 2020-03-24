import { ActCtxOption, Type, Modules, IocContext, createContext, CTX_CURR_DECOR, IInjector } from '@tsdi/ioc';
import { CTX_INJ_MODULE } from '../context-tokens';


/**
 * module inject action option.
 */
export interface InjOption extends ActCtxOption {
    module: Modules;
}

/**
 * module inject action context.
 */
export class InjContext extends IocContext<InjOption> {

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
     * @param {InjOption} options
     * @returns {InjContext}
     * @memberof InjectorActionContext
     */
    static parse(injector: IInjector, options: InjOption): InjContext {
        return createContext(injector, InjContext, options);
    }

    setOptions(options: InjOption) {
        if (!options) {
            return this;
        }
        if (options.module) {
            this.setValue(CTX_INJ_MODULE, options.module);
        }
        return super.setOptions(options);
    }
}
