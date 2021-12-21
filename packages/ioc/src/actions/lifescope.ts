import { IocActions } from './act';
import { IocContext, RegContext } from './ctx';

/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocActions<T>}
 */
export class LifeScope<T extends IocContext> extends IocActions<T> { }

/**
 * register life scope.
 *
 * @export
 * @class RegisterLifeScope
 * @extends {IocRegScope<T>}
 * @template T
 */
export class RegisterLifeScope<T extends RegContext = RegContext> extends IocActions<T> {
    /**
     * register.
     * @param ctx reg context.
     * @param next next do sth.
     */
    register(ctx: T, next?: () => void) {
        this.handle(ctx, next);
    }

}
