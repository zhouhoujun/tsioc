import { Type, Token } from '../types';
import { IocProvidersContext, IocProvidersOption } from './IocAction';
import { ITypeReflect } from '../services/ITypeReflect';
import { CTX_CURR_DECOR, CTX_TARGET_RELF, CTX_TOKEN, CTX_TYPE, CTX_SINGLETON } from '../context-tokens';

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
    token?: Token;
    /**
     * target type.
     *
     * @type {Type}
     * @memberof RegisterActionOption
     */
    type: Type;

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
    get token(): Token {
        return this.getValue(CTX_TOKEN);
    }

    /**
     * target type.
     *
     * @type {Type}
     * @memberof RegisterActionContext
     */
    get type(): Type {
        return this.getValue(CTX_TYPE);
    }

    get currDecoractor(): string {
        return this.getValue(CTX_CURR_DECOR);
    }

    /**
     * custom set singleton or not.
     *
     * @type {boolean}
     * @memberof RegisterActionOption
     */
    get singleton(): boolean {
        return this.getValue(CTX_SINGLETON) === true;
    }

    get targetReflect(): ITypeReflect {
        if (!this.context.hasSingleton(CTX_TARGET_RELF)) {
            let refl = this.reflects.get(this.type);
            refl && this.context.setValue(CTX_TARGET_RELF, refl);
        }
        return this.context.getSingleton(CTX_TARGET_RELF);
    }

    setOptions(options: T) {
        if (!options) {
            return this;
        }
        if (options.token) {
            this.context.setValue(CTX_TOKEN, options.token);
        }

        if (options.type) {
            this.context.setValue(CTX_TYPE, options.type);
        }
        if (options.singleton) {
            this.context.setValue(CTX_SINGLETON, options.singleton);
        }
        return super.setOptions(options);
    }
}
