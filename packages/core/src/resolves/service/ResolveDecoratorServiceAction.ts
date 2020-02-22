import { DecoratorProvider, isNullOrUndefined, isClassType, CTX_TARGET_TOKEN, InjectReference } from '@tsdi/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';
import { CTX_CURR_TOKEN } from '../../context-tokens';

export const ResolveDecoratorServiceAction = function (ctx: ResolveServiceContext, next: () => void): void {
    let clasType = ctx.getValue(CTX_TARGET_TOKEN);
    let reflects = ctx.reflects;
    let injector = ctx.injector;
    if (isClassType(clasType)) {
        let dprvoider = reflects.getActionInjector().getInstance(DecoratorProvider);
        let tk = ctx.getValue(CTX_CURR_TOKEN);
        reflects.getDecorators(clasType)
            .some(dec => {
                if (dprvoider.has(dec, tk)) {
                    ctx.instance = dprvoider.resolve(dec, tk, ctx.providers);
                }
                if (ctx.instance) {
                    return true;
                }
                let refDec = new InjectReference(tk, dec);
                if (injector.hasRegister(refDec)) {
                    ctx.instance = injector.get(refDec, ctx.providers);
                }
                return !!ctx.instance;
            });
    }

    if (isNullOrUndefined(ctx.instance)) {
        return next();
    }
};
