import { ActionContextOption, Type, Modules, IocRaiseContext, ContainerFactory, createRaiseContext, CTX_CURR_DECOR } from '@tsdi/ioc';


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
        return this.getOptions().module;
    }

    get currDecoractor(): string {
        return this.get(CTX_CURR_DECOR);
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
     * @param {InjectActionOption} options
     * @returns {InjectActionContext}
     * @memberof InjectorActionContext
     */
    static parse(options: InjectActionOption, containerFactory: ContainerFactory): InjectActionContext {
        return createRaiseContext(InjectActionContext, options, containerFactory);
    }
}
