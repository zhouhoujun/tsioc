import { ActionContextOption, Type, Modules, IocRaiseContext, ContainerFactory, createRaiseContext, CTX_CURR_DECOR } from '@tsdi/ioc';


/**
 * Injector action option.
 *
 * @export
 * @interface InjectorActionOption
 */
export interface InjectorActionOption extends ActionContextOption {
    module: Modules;
}

/**
 * Ioc Injector action context.
 *
 * @export
 * @class InjectorActionContext
 * @extends {IocActionContext}
 */
export class InjectorActionContext extends IocRaiseContext<InjectorActionOption> {

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
     * @param {InjectorActionOption} options
     * @returns {InjectorActionContext}
     * @memberof InjectorActionContext
     */
    static parse(options: InjectorActionOption, containerFactory: ContainerFactory): InjectorActionContext {
        return createRaiseContext(InjectorActionContext, options, containerFactory);
    }
}
