import { IocContext, IocCompositeAction } from './Action';

import { RegContext } from './reg';

/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCompositeAction<T>}
 */
export class LifeScope<T extends IocContext> extends IocCompositeAction<T> {

}


/**
 * register life scope.
 *
 * @export
 * @class RegisterLifeScope
 * @extends {IocRegScope<T>}
 * @template T
 */
export class RegisterLifeScope<T extends RegContext = RegContext> extends IocCompositeAction<T> {

    register(ctx: T, next?: () => void) {
        this.execute(ctx, next);
    }

}
