import { ActionContextOption, IocActionContext, Type, DecoratorType, IIocContainer, ObjectMap } from '@ts-ioc/ioc';


/**
 * Injector action option.
 *
 * @export
 * @interface InjectorActionOption
 */
export interface InjectorActionOption extends ActionContextOption {
    /**
     * target type.
     *
     * @type {Type<any>}
     * @memberof InjectorActionOption
     */
    targetType: Type<any>;

}

/**
 * Ioc Injector action context.
 *
 * @export
 * @class InjectorActionContext
 * @extends {IocActionContext}
 */
export abstract class InjectorActionContext extends IocActionContext {

    decorState?: ObjectMap<boolean>;
    /**
     * target type.
     *
     * @type {Type<any>}
     * @memberof InjectorActionContext
     */
    targetType?: Type<any>;
    /**
     * curr decorator.
     *
     * @type {string}
     * @memberof InjectorActionContext
     */
    currDecoractor?: string;
    /**
     * curr decorator type.
     *
     * @type {DecoratorType}
     * @memberof InjectorActionContext
     */
    currDecorType?: DecoratorType;

    constructor(targetType: Type<any>, raiseContainer?: IIocContainer | (() => IIocContainer)) {
        super(raiseContainer);
        this.targetType = targetType;
    }

    setOptions(options: InjectorActionOption) {
        super.setOptions(options);
    }

}
