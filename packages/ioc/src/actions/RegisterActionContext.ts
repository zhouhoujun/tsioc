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
export class RegisterActionContext<T extends RegisterActionOption = RegisterActionOption> extends IocProvidersContext<T> {
    /**
     * resolve token.
     *
     * @type {Token}
     * @memberof RegisterActionContext
     */
    get tokenKey(): Token {
        return this.getOptions().tokenKey;
    }

    /**
     * target type.
     *
     * @type {Type}
     * @memberof RegisterActionContext
     */
    get targetType(): Type {
        return this.getOptions().targetType;
    }

    /**
     * custom set singleton or not.
     *
     * @type {boolean}
     * @memberof RegisterActionOption
     */
    get singleton(): boolean {
        return this.getOptions().singleton === true;
    }

    get targetReflect(): ITypeReflect {
        return this.reflects.get(this.targetType);
    }

    constructor(targetType?: Type) {
        super();
        if (targetType) {
            this._options = { targetType: targetType } as T;
        }
    }

}
