import { isClass } from '@tsdi/ioc';
import { InjectorAction } from './InjectorAction';
import { InjectorActionContext } from './InjectorActionContext';
import { CTX_CURR_TYPE } from '../contextTokens';

export class RegisterTypeAction extends InjectorAction {
    execute(ctx: InjectorActionContext, next: () => void): void {
        let currType = ctx.get(CTX_CURR_TYPE);
        if (isClass(currType)) {
            ctx.getContainer().register(currType);
            ctx.registered.push(currType);
        }
        next();
    }
}
