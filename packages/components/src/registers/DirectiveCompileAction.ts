import { CTX_CURR_DECOR, DesignContext, IProviders, DecoratorProvider } from '@tsdi/ioc';
import { Compiler } from '@tsdi/boot';
import { IDirectiveMetadata } from '../decorators/IComponentMetadata';
import { IDirectiveReflect } from '../IDirectiveReflect';
import { BindingsCache } from './BindingsCache';

/**
 * Directive compile action.
 */
export const DirectiveCompileAction = function (ctx: DesignContext, next: () => void): void {
    let currDecor = ctx.getValue(CTX_CURR_DECOR);
    let injector = ctx.injector;
    let metas = ctx.reflects.getMetadata<IDirectiveMetadata>(currDecor, ctx.type);
    let compRefl = ctx.targetReflect as IDirectiveReflect;
    let prdrs: IProviders;
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
    compRefl.decorator = currDecor;
    compRefl.directive = true;

    if (ctx.type.getDirectiveDef) {
        compRefl.directiveDef = ctx.type.getDirectiveDef();
    } else {
        const compiler = prdrs.getInstance(Compiler);
        compRefl.directiveDef = compiler.compileDirective();
    }

    next();
};
