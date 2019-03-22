import { Type, Token } from '../types';
import { IocActionContext, ActionContextOption } from './Action';
import { ITypeReflect } from '../services';
import { IIocContainer } from '../IIocContainer';
import { IResolverContainer } from '../IResolver';

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

    constructor(targetType: Type<any>, tokenKey?: Token<any>) {
        super();
        this.targetType = targetType;
        this.tokenKey = tokenKey;
    }

    /**
     * create register context.
     *
     * @static
     * @param {RegisterActionOption} options
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainerGetter]
     * @param {(IResolverContainer | (() => IResolverContainer))} [providersGetter]
     * @returns {RegisterActionContext}
     * @memberof RegisterActionContext
     */
    static parse(options: RegisterActionOption, raiseContainerGetter?: IIocContainer | (() => IIocContainer), providersGetter?: IResolverContainer | (() => IResolverContainer)): RegisterActionContext {
        let ctx = new RegisterActionContext(options.targetType);
        ctx.setContext(ctx, options, raiseContainerGetter, providersGetter);
        return ctx;
    }

    setOptions(options: RegisterActionOption) {
        super.setOptions(options);
    }

}
