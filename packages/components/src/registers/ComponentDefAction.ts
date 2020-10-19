import { DesignContext } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { CompilerFacade } from '../compile/facade';
import { ComponentReflect } from '../reflect';

/**
 * component def compile action.
 * @param ctx
 * @param next
 */
export const ComponentDefAction = function (ctx: DesignContext, next: () => void): void {
    const compRefl = ctx.reflect as ComponentReflect;
    if (!(compRefl.annoType === 'component')) {
        return next();
    }
    if (ctx.type.ρCmp) {
        compRefl.componentDef = ctx.type.ρCmp();
        return next();
    }

    const currDecor = ctx.currDecor;
    const injector = ctx.injector as ICoreInjector;

    const compiler = injector.getService({ token: CompilerFacade, target: currDecor });
    ctx.type.ρCmp = compRefl.componentDef = compiler.compileComponent(compRefl);

    next();

};
