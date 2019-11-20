import { Type, Token } from '../types';
import { IocProvidersContext, IocProvidersOption } from './Action';
import { InjectToken } from '../InjectToken';
import { ITypeReflect } from '../services/ITypeReflect';

/**
 * register action option.
 *
 * @export
 * @interface RegisterActionOption
 */
export interface RegisterActionOption extends IocProvidersOption {
    /**
     * target type reflect.
     *
     * @type {ITypeReflect}
     * @memberof IocActionContext
     */
    targetReflect?: ITypeReflect;
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
export class RegisterActionContext extends IocProvidersContext {
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

    get targetReflect(): ITypeReflect {
        return this.reflects.get(this.targetType);
    }


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
