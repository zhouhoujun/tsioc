import { isClass } from '@tsdi/ioc';
import { InjectActionContext } from './InjectActionContext';
import { CTX_CURR_TYPE } from '../context-tokens';

export const RegisterTypeAction = function (ctx: InjectActionContext, next: () => void): void {
    let currType = ctx.get(CTX_CURR_TYPE);
    if (isClass(currType)) {
        ctx.injector.registerType(currType);
        ctx.registered.push(currType);
    }
    next();
};
