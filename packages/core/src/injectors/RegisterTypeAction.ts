import { isClass } from '@tsdi/ioc';
import { InjectAction } from './InjectAction';
import { InjectActionContext } from './InjectActionContext';
import { CTX_CURR_TYPE } from '../context-tokens';

export class RegisterTypeAction extends InjectAction {
    execute(ctx: InjectActionContext, next: () => void): void {
        let currType = ctx.get(CTX_CURR_TYPE);
        if (isClass(currType)) {
            ctx.injector.registerType(currType);
            ctx.registered.push(currType);
        }
        next();
    }
}
