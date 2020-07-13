import { CTX_CURR_DECOR, DesignContext, IProviders, DecoratorProvider, lang } from '@tsdi/ioc';
import { IDirectiveMetadata } from '../decorators/metadata';
import { IDirectiveReflect } from '../IReflect';
import { CompilerFacade } from '../compile/CompilerFacade';

/**
 * Directive def compile action.
 */
export const DirectiveDefAction = function (ctx: DesignContext, next: () => void): void {
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
    compRefl.decorator = currDecor;
    compRefl.directive = true;

    if (ctx.type.d0Dir) {
        compRefl.directiveDef = ctx.type.d0Dir();
    } else {
        const compiler = prdrs.getInstance(CompilerFacade);
        compRefl.directiveDef = compiler.compileDirective(lang.first(metas));
    }

    next();
};
