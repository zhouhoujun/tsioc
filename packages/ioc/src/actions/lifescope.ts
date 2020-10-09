import { IocContext, IocActions } from './act';
import { RegContext } from './reg';

/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocActions<T>}
 */
export class LifeScope<T extends IocContext> extends IocActions<T> {

}


/**
 * register life scope.
 *
 * @export
 * @class RegisterLifeScope
 * @extends {IocRegScope<T>}
 * @template T
 */
export class RegisterLifeScope<T extends RegContext = RegContext> extends IocActions<T> {

    register(ctx: T, next?: () => void) {
        this.execute(ctx, next);
    }

}
