import { IocAction, IocPdrsContext, IocPdrsOption } from './IocAction';
import { Type, Token } from '../types';
import { ITypeReflect } from '../services/ITypeReflect';
import { CTX_CURR_DECOR, CTX_TARGET_RELF, CTX_TOKEN, CTX_TYPE, CTX_SINGLETON } from '../context-tokens';
import { isClass } from '../utils/lang';
import { IocCompositeAction } from './IocAction';


/**
 * register action option.
 *
 * @export
 * @interface RegOption
 */
export interface RegOption extends IocPdrsOption {
    /**
     * resolve token.
     */
    token?: Token;
    /**
     * target type.
     */
    type: Type;

    /**
     * custom set singleton or not.
     */
    singleton?: boolean;

}


/**
 * Ioc Register action context.
 *
 * @export
 * @class RegContext
 * @extends {IocActionContext}
 */
export class RegContext<T extends RegOption = RegOption> extends IocPdrsContext<T> {
    /**
     * resolve token.
     *
     */
    get token(): Token {
        return this.getValue(CTX_TOKEN);
    }

    /**
     * target type.
     *
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
     */
    get singleton(): boolean {
        return this.getValue(CTX_SINGLETON) === true;
    }

    get targetReflect(): ITypeReflect {
        return this.getValue(CTX_TARGET_RELF) ?? this.getTargetReflect();
    }

    protected getTargetReflect() {
        let refl = this.reflects.get(this.type);
        refl && this.context.setValue(CTX_TARGET_RELF, refl);
        return refl;
    }

    setOptions(options: T) {
        if (!options) {
            return this;
        }
        if (options.token) {
            this.setValue(CTX_TOKEN, options.token);
        }

        if (options.type) {
            this.setValue(CTX_TYPE, options.type);
        }
        if (options.singleton) {
            this.setValue(CTX_SINGLETON, options.singleton);
        }
        return super.setOptions(options);
    }
}


/**
 * ioc register action.
 *
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 */
export abstract class IocRegAction<T extends RegContext> extends IocAction<T> {

}


/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 *
 */
export abstract class IocRegScope<T extends RegContext = RegContext> extends IocCompositeAction<T> {

}


export const InitReflectAction = function (ctx: RegContext, next?: () => void): void {
    if (!isClass(ctx.type)) {
        return;
    }
    ctx.reflects.create(ctx.type);
    let targetReflect = ctx.targetReflect;
    if (ctx.singleton) {
        targetReflect.singleton = ctx.singleton;
    }

    if (next) {
        return next();
    }
}
