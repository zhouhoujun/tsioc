import { DesignContext, DecoratorProvider, IProvider } from '@tsdi/ioc';
import { IComponentReflect } from '../IComponentReflect';
import { attrExp } from '../bindings/exps';
import { IComponentMetadata } from '../decorators/IComponentMetadata';
import { ComponentProvider } from '../ComponentProvider';
import { BindingsCache } from './BindingsCache';

/**
 * component register action.
 */
export const ComponentRegAction = function (ctx: DesignContext, next: () => void): void {
    let currDecor = ctx.currDecor;
    let injector = ctx.injector;
    let metas = ctx.reflects.getMetadata<IComponentMetadata>(currDecor, ctx.type);
    let compRefl = ctx.reflect as IComponentReflect;
    let prdrs: IProvider;
    if (!compRefl.getDecorProviders) {
        prdrs = ctx.reflects.getActionInjector().getInstance(DecoratorProvider).getProviders(currDecor);
        if (prdrs) {
            compRefl.getDecorProviders = () => prdrs;
        }
    } else {
        prdrs = compRefl.getDecorProviders();
    }
    if (!compRefl.getBindings) {
        let caches = prdrs.getInstance(BindingsCache);
        compRefl.getBindings = (decor) => {
            return caches.getCache(decor);
        }
    }
    let compdr = prdrs.getInstance(ComponentProvider);
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
                    injector.bindProvider(compdr.toAttrSelectorToken(sel), ctx.type);
                } else {
                    compRefl.selector = sel;
                    injector.bindProvider(compdr.toSelectorToken(sel), ctx.type);
                }
            })
        } else {
            if (attrExp.test(meta.selector)) {
                compRefl.attrSelector = meta.selector;
                injector.bindProvider(compdr.toAttrSelectorToken(meta.selector), ctx.type);
            } else {
                compRefl.selector = meta.selector;
                injector.bindProvider(compdr.toSelectorToken(meta.selector), ctx.type);
            }
        }
    });

    next();
};

