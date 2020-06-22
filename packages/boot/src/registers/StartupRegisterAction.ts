import { DesignContext, CTX_CURR_DECOR, isString } from '@tsdi/ioc';
import { BootMetadata } from '../decorators/Boot';
import { STARTUPS } from '../services/StartupService';

export const StartupRegisterAction = function (ctx: DesignContext, next: () => void): void {
    const injector = ctx.injector;
    const classType = ctx.type;
    let startups = injector.get(STARTUPS) || [];
    let metas = ctx.reflects.getMetadata<BootMetadata>(ctx.getValue(CTX_CURR_DECOR), classType);
    const meta = metas[0] || <BootMetadata>{};
    let idx = -1;
    if (meta.before) {
        idx = isString(meta.before) ? 0 : startups.indexOf(meta.before);
    } else if (meta.after) {
        idx = isString(meta.after) ? -1 : startups.indexOf(meta.after) + 1;
    }
    if (idx >= 0) {
        if (meta.deps) {
            startups = [...startups.slice(0, idx), ...meta.deps, classType].concat(startups.slice(idx).filter(s => meta.deps.indexOf(s) < 0));
        } else {
            startups.splice(idx, 0, classType);
        }
    } else {
        if (meta.deps) {
            meta.deps.forEach(d => {
                if (startups.indexOf(d) < 0) {
                    startups.push(d);
                }
            });
        }
        startups.push(classType);
    }
    injector.setValue(STARTUPS, startups);
    return next();
}
