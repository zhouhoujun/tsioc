import { Modules, IocContext, Type, ClassType } from '@tsdi/ioc';


/**
 * module inject action option.
 */
export interface InjOption {
    module: Modules;
}

/**
 * module inject action context.
 */
export interface InjContext extends IocContext {

    /**
     * the module to injector to container.
     *
     * @type {Modules}
     * @memberof InjectorActionContext
     */
    module: Modules;

    /**
     * types in  module.
     *
     * @type {Type[]}
     * @memberof InjectorActionContext
     */
    types: Type[];

    currDecoractor?: string;

    currType?: ClassType;

    /**
     * registered types.
     *
     * @type {Type[]}
     * @memberof InjectorActionContext
     */
    registered?: Type[];

    state?: any;

}
