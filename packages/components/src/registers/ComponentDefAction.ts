import { DesignContext } from '@tsdi/ioc';
import { ICoreInjector } from '@tsdi/core';
import { CompilerFacade } from '../compile/facade';
import { ComponentReflect } from '../reflect';
import { ComponentType } from '../type';

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
    const type = ctx.type as ComponentType;
    if (type.ρcmp) {
        compRefl.componentDef = type.ρcmp(ctx);
        return next();
    }

    const currDecor = ctx.currDecor;
    const injector = ctx.injector as ICoreInjector;

    const compiler = injector.getService({ token: CompilerFacade, target: currDecor });
    type.ρcmp = compiler.compileComponent(compRefl);
    compRefl.componentDef  = type.ρcmp(ctx);

    next();

};
