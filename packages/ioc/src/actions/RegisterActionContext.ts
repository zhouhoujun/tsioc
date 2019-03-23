import { Type, Token } from '../types';
import { IocActionContext, ActionContextOption } from './Action';
import { ITypeReflect } from '../services';
import { IIocContainer } from '../IIocContainer';

/**
 * register action option.
 *
 * @export
 * @interface RegisterActionOption
 */
export interface RegisterActionOption extends ActionContextOption {
    /**
     * resolve token.
     *
     * @type {Token<any>}
     * @memberof RegisterActionContext
     */
    tokenKey?: Token<any>;
    /**
     * target type.
     *
     * @type {Type<any>}
     * @memberof RegisterActionContext
     */
    targetType: Type<any>;

    /**
     * target type reflect.
     *
     * @type {ITypeReflect}
     * @memberof IocActionContext
     */
    targetReflect?: ITypeReflect;

    /**
     * custom set singleton or not.
     *
     * @type {boolean}
     * @memberof IocActionContext
     */
    singleton?: boolean;

}

/**
 * Ioc Register action context.
 *
 * @export
 * @class RegisterActionContext
 * @extends {IocActionContext}
 */
export class RegisterActionContext extends IocActionContext {

    /**
     * resolve token.
     *
     * @type {Token<any>}
     * @memberof RegisterActionContext
     */
    tokenKey?: Token<any>;

    /**
     * target type.
     *
     * @type {Type<any>}
     * @memberof RegisterActionContext
     */
    targetType?: Type<any>;

    /**
     * target type reflect.
     *
     * @type {ITypeReflect}
     * @memberof IocActionContext
     */
    targetReflect?: ITypeReflect;

    /**
     * custom set singleton or not.
     *
     * @type {boolean}
     * @memberof IocActionContext
     */
    singleton?: boolean;

    constructor(targetType: Type<any>, raiseContainer?: IIocContainer | (() => IIocContainer)) {
        super(raiseContainer);
        this.targetType = targetType;
    }

    /**
     * create register context.
     *
     * @static
     * @param {RegisterActionOption} options
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainer]
     * @returns {RegisterActionContext}
     * @memberof RegisterActionContext
     */
    static parse(options: RegisterActionOption, raiseContainer?: IIocContainer | (() => IIocContainer)): RegisterActionContext {
        let ctx = new RegisterActionContext(options.targetType, raiseContainer);
        ctx.setOptions(options);
        return ctx;
    }

    setOptions(options: RegisterActionOption) {
        super.setOptions(options);
    }

}
