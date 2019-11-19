import { Type, Token } from '../types';
import { ActionContextOption, IocRaiseContext } from './Action';
import { InjectToken } from '../InjectToken';

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
     * @type {Token}
     * @memberof RegisterActionOption
     */
    tokenKey?: Token;
    /**
     * target type.
     *
     * @type {Type}
     * @memberof RegisterActionOption
     */
    targetType: Type;

    /**
     * custom set singleton or not.
     *
     * @type {boolean}
     * @memberof RegisterActionOption
     */
    singleton?: boolean;

}

export const CTX_CURR_DECOR = new InjectToken<string>('CTX_CURR_DECOR');
export const CTX_CURR_DECOR_SCOPE = new InjectToken<any>('CTX_CURR_DECOR_SCOPE');
/**
 * Ioc Register action context.
 *
 * @export
 * @class RegisterActionContext
 * @extends {IocActionContext}
 */
export class RegisterActionContext extends IocRaiseContext {
    /**
     * resolve token.
     *
     * @type {Token}
     * @memberof RegisterActionContext
     */
    tokenKey?: Token;
    /**
     * target type.
     *
     * @type {Type}
     * @memberof RegisterActionContext
     */
    targetType?: Type;

    /**
     * custom set singleton or not.
     *
     * @type {boolean}
     * @memberof RegisterActionOption
     */
    singleton?: boolean;


    constructor(targetType?: Type) {
        super();
        this.targetType = targetType;
    }

    setOptions(options: RegisterActionOption) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.tokenKey) {
            this.tokenKey = options.tokenKey;
        }
        if (options.targetType) {
            this.targetType = options.targetType;
        }
        if (options.singleton) {
            this.singleton = options.singleton;
        }
    }

}
