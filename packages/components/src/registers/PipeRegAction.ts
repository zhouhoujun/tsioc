import { DesignContext } from '@tsdi/ioc';
import { IPipeMetadata } from '../decorators/Pipe';

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
    let metas = ctx.reflects.getMetadata<IPipeMetadata>(currDecor, ctx.type);

    metas.forEach(meta => {
        if (meta.name) {
            injector.bindProvider(meta.name, ctx.type);
            ctx.targetReflect.provides.push(meta.name);
        }
    });

    next();
};
