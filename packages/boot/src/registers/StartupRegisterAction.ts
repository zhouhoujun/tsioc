import { DesignContext, CTX_CURR_DECOR } from '@tsdi/ioc';
import { BootMetadata } from '../decorators/Boot';
import { STARTUPS } from '../services/StartupService';

export const StartupRegisterAction = function (ctx: DesignContext, next: () => void): void {
    const injector = ctx.injector;
    let startups = injector.get(STARTUPS) || [];
    let metas = ctx.reflects.getMetadata<BootMetadata>(ctx.getValue(CTX_CURR_DECOR), ctx.type);
    const meta = metas.find(meta => meta) || <BootMetadata>{};
    if (meta.order === 'first') {
        if (meta.deps) {
            startups = [...meta.deps, meta.type].concat(startups.filter(s => meta.deps.indexOf(s) < 0));
        } else {
            startups.unshift(meta.type);
        }
    } else {
        if (meta.deps) {
            meta.deps.forEach(d => {
                if (startups.indexOf(d) < 0) {
                    startups.push(d);
                }
            });
        }
        startups.push(meta.type);
    }
    injector.setValue(STARTUPS, startups);
    return next();
}
