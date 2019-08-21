import { RegisterActionContext } from './RegisterActionContext';
import { IocRegisterScope } from './IocRegisterScope';

/**
 * register life scope.
 *
 * @export
 * @class RegisterLifeScope
 * @extends {IocRegisterScope<T>}
 * @template T
 */
export class RegisterLifeScope<T extends RegisterActionContext = RegisterActionContext> extends IocRegisterScope<T> {

    register(ctx: T, next?: () => void) {
        this.execute(ctx, next);
    }

}
