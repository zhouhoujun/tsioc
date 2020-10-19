import { DesignContext } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { CompilerFacade } from '../compile/facade';
import { DirectiveReflect } from '../reflect';

/**
 * Directive def compile action.
 */
export const DirectiveDefAction = function (ctx: DesignContext, next: () => void): void {
    const decorRefl = ctx.reflect as DirectiveReflect;
    if (!(decorRefl.annoType === 'component')) {
        return next();
    }
    if (ctx.type.ρDir) {
        decorRefl.directiveDef = ctx.type.ρDir();
        return next();
    }

    const currDecor = ctx.currDecor;
    const injector = ctx.injector as ICoreInjector;

    const compiler = injector.getService({ token: CompilerFacade, target: currDecor });
    ctx.type.ρDir = decorRefl.directiveDef = compiler.compileDirective(decorRefl);

    next();
};
