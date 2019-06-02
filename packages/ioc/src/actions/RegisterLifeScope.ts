import { RegisterActionContext } from './RegisterActionContext';
import { IocRegisterScope } from './IocRegisterScope';

export class RegisterLifeScope<T extends RegisterActionContext> extends IocRegisterScope<RegisterActionContext> {

    register(ctx: T, next?: () => void) {
        this.execute(ctx, next);
    }

}
