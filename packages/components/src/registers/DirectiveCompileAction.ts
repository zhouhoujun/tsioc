import { CTX_CURR_DECOR, DesignContext, IProviders, DecoratorProvider } from '@tsdi/ioc';
import { IDirectiveMetadata } from '../decorators/IComponentMetadata';
import { IDirectiveReflect } from '../IDirectiveReflect';
import { Compiler } from '../compile/parser';

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
