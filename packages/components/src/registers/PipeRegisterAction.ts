import { DesignActionContext, CTX_CURR_DECOR, DecoratorProvider } from '@tsdi/ioc';
import { IPipeMetadata } from '../decorators/Pipe';
import { RefSelector } from '../RefSelector';

/**
 * component register action.
 *
 * @export
 * @class ComponentRegisterAction
 * @extends {IocDesignAction}
 */
export const PipeRegisterAction = function (ctx: DesignActionContext, next: () => void): void {
    let currDecor = ctx.get(CTX_CURR_DECOR);
    let injector = ctx.injector;
    let metas = ctx.reflects.getMetadata<IPipeMetadata>(currDecor, ctx.type);
    let refSelector = ctx.reflects.getActionInjector().get(DecoratorProvider).resolve(currDecor, RefSelector);

    metas.forEach(meta => {
        if (meta.name) {
            injector.bindProvider(refSelector.toPipeToken(meta.name), ctx.type);
        }
    });

    next();
};
