import { ActionContextOption, Type,  Modules, IocRaiseContext, ContainerFactory, createRaiseContext } from '@tsdi/ioc';


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
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainer]
     * @returns {InjectorActionContext}
     * @memberof InjectorActionContext
     */
    static parse(options: InjectorActionOption, raiseContainer?: ContainerFactory): InjectorActionContext {
        return createRaiseContext(InjectorActionContext, options, raiseContainer);
    }

    // setOptions(options: InjectorActionOption) {
    //     if (!options) {
    //         return;
    //     }
    //     super.setOptions(options);
    //     if (options.module) {
    //         this.module = options.module;
    //     }
    // }

}
