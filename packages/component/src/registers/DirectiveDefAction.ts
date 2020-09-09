import { CTX_CURR_DECOR, DesignContext, IProviders, DecoratorProvider, lang } from '@tsdi/ioc';
import { DirectiveMetadata } from '../metadata';
import { IDirectiveReflect } from '../IReflect';
import { CompilerFacade } from '../compile/CompilerFacade';

/**
 * Directive def compile action.
 */
export const DirectiveDefAction = function (ctx: DesignContext, next: () => void): void {
    let currDecor = ctx.getValue(CTX_CURR_DECOR);
    let injector = ctx.injector;
    let metas = ctx.reflects.getMetadata<DirectiveMetadata>(currDecor, ctx.type);
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
    compRefl.decorator = currDecor;
    compRefl.directive = true;

    if (ctx.type.ρDir) {
        compRefl.directiveDef = ctx.type.ρDir();
    } else {
        const compiler = prdrs.getInstance(CompilerFacade);
        compRefl.directiveDef = compiler.compileDirective(lang.first(metas));
    }

    next();
};
