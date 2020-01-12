import { DesignActionContext, CTX_CURR_DECOR, DecoratorProvider } from '@tsdi/ioc';
import { IComponentReflect } from '../IComponentReflect';
import { attrExp } from '../bindings/exps';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { RefSelector } from '../RefSelector';

/**
 * component register action.
 *
 * @export
 * @class ComponentRegisterAction
 * @extends {IocDesignAction}
 */
export const ComponentRegisterAction = function (ctx: DesignActionContext, next: () => void): void {
    let currDecor = ctx.get(CTX_CURR_DECOR);
    let injector = ctx.injector;
    let metas = ctx.reflects.getMetadata<IComponentMetadata>(currDecor, ctx.type);
    let compRefl = ctx.targetReflect as IComponentReflect;
    let refSelector = ctx.reflects.getActionInjector().get(DecoratorProvider).resolve(currDecor, RefSelector);
    compRefl.decorator = currDecor;
    compRefl.component = true;
    metas.forEach(meta => {
        if (!meta.selector) {
            return;
        }
        if (meta.selector.indexOf(',') > 0) {
            meta.selector.split(',').forEach(sel => {
                sel = sel.trim();
                if (attrExp.test(sel)) {
                    compRefl.attrSelector = sel;
                    injector.bindProvider(refSelector.toAttrSelectorToken(sel), ctx.type);
                } else {
                    compRefl.selector = sel;
                    injector.bindProvider(refSelector.toSelectorToken(sel), ctx.type);
                }
            })
        } else {
            if (attrExp.test(meta.selector)) {
                compRefl.attrSelector = meta.selector;
                injector.bindProvider(refSelector.toAttrSelectorToken(meta.selector), ctx.type);
            } else {
                compRefl.selector = meta.selector;
                injector.bindProvider(refSelector.toSelectorToken(meta.selector), ctx.type);
            }
        }
    });

    next();
};
