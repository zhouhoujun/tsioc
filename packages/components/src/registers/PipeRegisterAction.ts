import { DesignActionContext, CTX_CURR_DECOR } from '@tsdi/ioc';
import { IPipeMetadata } from '../decorators/Pipe';

/**
 * component register action.
 *
 * @export
 * @class ComponentRegisterAction
 * @extends {IocDesignAction}
 */
export const PipeRegisterAction = function (ctx: DesignActionContext, next: () => void): void {
    let currDecor = ctx.getValue(CTX_CURR_DECOR);
    let injector = ctx.injector;
    let metas = ctx.reflects.getMetadata<IPipeMetadata>(currDecor, ctx.type);

    metas.forEach(meta => {
        if (meta.name) {
            injector.bindProvider(meta.name, ctx.type);
        }
    });

    next();
};
