import { DesignContext } from '@tsdi/ioc';
import { PipeMetadata } from '../metadata';

/**
 * component register action.
 *
 * @export
 * @class ComponentRegisterAction
 * @extends {IocDesignAction}
 */
export const PipeRegAction = function (ctx: DesignContext, next: () => void): void {
    let currDecor = ctx.currDecor;
    let injector = ctx.injector;
    let metas = ctx.reflect;

    metas.forEach(meta => {
        if (meta.name) {
            injector.bindProvider(meta.name, ctx.type);
        }
    });

    next();
};
