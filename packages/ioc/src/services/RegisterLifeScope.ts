import { LifeScope } from './LifeScope';
import { RegisterActionContext } from '../actions';

export class RegisterLifeScope<T extends RegisterActionContext> extends LifeScope<RegisterActionContext> {

    register(ctx: T, next?: () => void) {
        this.execute(ctx, next);
    }

}
