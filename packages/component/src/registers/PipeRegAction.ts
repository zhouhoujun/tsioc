import { DesignContext, CTX_CURR_DECOR } from '@tsdi/ioc';
import { PipeMetadata } from '../metadata';

/**
 * component register action.
 *
 * @export
 * @class ComponentRegisterAction
 * @extends {IocDesignAction}
 */
export const PipeRegAction = function (ctx: DesignContext, next: () => void): void {
    let currDecor = ctx.getValue(CTX_CURR_DECOR);
    let injector = ctx.injector;
    let metas = ctx.reflects.getMetadata<PipeMetadata>(currDecor, ctx.type);

    metas.forEach(meta => {
        if (meta.name) {
            injector.bindProvider(meta.name, ctx.type);
        }
    });

    next();
};
