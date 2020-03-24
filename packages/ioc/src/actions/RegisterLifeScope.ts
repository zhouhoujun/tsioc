import { RegContext } from './RegContext';
import { IocRegScope } from './IocRegScope';

/**
 * register life scope.
 *
 * @export
 * @class RegisterLifeScope
 * @extends {IocRegScope<T>}
 * @template T
 */
export class RegisterLifeScope<T extends RegContext = RegContext> extends IocRegScope<T> {

    register(ctx: T, next?: () => void) {
        this.execute(ctx, next);
    }

}
