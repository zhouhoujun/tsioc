import { DesignContext } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { CompilerFacade } from '../compile/facade';
import { DirectiveReflect } from '../reflect';
import { DirectiveType } from '../type';

/**
 * Directive def compile action.
 */
export const DirectiveDefAction = function (ctx: DesignContext, next: () => void): void {
    const decorRefl = ctx.reflect as DirectiveReflect;
    const type = ctx.type as DirectiveType;
    if (!(decorRefl.annoType === 'directive')) {
        return next();
    }

    if (type.ρdir && (type.ρdir as any).type === ctx.type) {
        decorRefl.def = type.ρdir;
        return next();
    }

    const currDecor = ctx.currDecor;
    const injector = ctx.injector as ICoreInjector;

    const compiler = injector.getService({ token: CompilerFacade, target: currDecor });
    decorRefl.def = compiler.compileDirective(decorRefl);

    next();
};
