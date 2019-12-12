import { Type, Token } from '../types';
import { IocProvidersContext, IocProvidersOption } from './IocAction';
import { ITypeReflect } from '../services/ITypeReflect';
import { CTX_CURR_DECOR } from '../context-tokens';

/**
 * register action option.
 *
 * @export
 * @interface RegisterActionOption
 */
export interface RegisterActionOption extends IocProvidersOption {
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

    get currDecoractor(): string {
        return this.get(CTX_CURR_DECOR);
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

    private _targetReflect: ITypeReflect;
    get targetReflect(): ITypeReflect {
        if (!this._targetReflect) {
            this._targetReflect = this.reflects.get(this.targetType);
        }
        return this._targetReflect;
    }
}
