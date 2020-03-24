import { RegContext } from './RegContext';
import { isClass } from '../utils/lang';

export const InitReflectAction = function (ctx: RegContext, next?: () => void): void {
    if (!isClass(ctx.type)) {
        return;
    }
    ctx.reflects.create(ctx.type);
    let targetReflect = ctx.targetReflect;
    if (ctx.singleton) {
        targetReflect.singleton = ctx.singleton;
    }

    if (next) {
        return next();
    }
}
