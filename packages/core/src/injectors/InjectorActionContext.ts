import { ActionContextOption, IocActionContext, Type, IIocContainer, ObjectMap, Modules } from '@tsdi/ioc';


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
export class InjectorActionContext extends IocActionContext {

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
     * @type {Type<any>[]}
     * @memberof InjectorActionContext
     */
    types: Type<any>[];

    /**
     * registered types.
     *
     * @type {Type<any>[]}
     * @memberof InjectorActionContext
     */
    registered: Type<any>[];

    /**
     * decorator action state.
     *
     * @type {ObjectMap<boolean>}
     * @memberof InjectorActionContext
     */
    decorState: ObjectMap<boolean>;
    /**
     * curr register type.
     *
     * @type {Type<any>}
     * @memberof InjectorActionContext
     */
    currType?: Type<any>;
    /**
     * curr decorator.
     *
     * @type {string}
     * @memberof InjectorActionContext
     */
    currDecoractor?: string;


    constructor(raiseContainer?: IIocContainer | (() => IIocContainer)) {
        super(raiseContainer);
    }

    /**
     * injector action context.
     *
     * @static
     * @param {InjectorActionOption} options
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainer]
     * @returns {InjectorActionContext}
     * @memberof InjectorActionContext
     */
    static parse(options: InjectorActionOption, raiseContainer?: IIocContainer | (() => IIocContainer)): InjectorActionContext {
        let ctx = new InjectorActionContext(raiseContainer);
        ctx.setOptions(options);
        return ctx;
    }

    setOptions(options: InjectorActionOption) {
        super.setOptions(options);
    }

}
