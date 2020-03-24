import {
    DecoratorProvider, isNullOrUndefined, isClassType, CTX_TARGET_TOKEN, InjectReference,
    IocResolveScope, IActionSetup, isToken, lang
} from '@tsdi/ioc';
import { ServiceContext } from './ServiceContext';
import { CTX_CURR_TOKEN, CTX_TARGET_REFS } from '../context-tokens';


export class ResolveServiceScope extends IocResolveScope<ServiceContext> implements IActionSetup {
    execute(ctx: ServiceContext, next?: () => void): void {
        if (ctx.instance || !ctx.tokens || !ctx.tokens.length) {
            return;
        }

        super.execute(ctx);

        next && next();

        if (!ctx.instance) {
            // after all resolve default.
            let defaultTk = ctx.defaultToken;
            if (defaultTk) {
                ctx.instance = ctx.injector.get(defaultTk, ctx.providers);
            }
        }
        // after all clean.
        ctx.destroy();

    }

    setup() {
        this.use(RsvTagSericeScope)
            .use(RsvTokenServiceAction);
    }
}


export class RsvTagSericeScope extends IocResolveScope<ServiceContext> implements IActionSetup {

    execute(ctx: ServiceContext, next?: () => void): void {
        if (ctx.hasValue(CTX_TARGET_REFS)) {
            let tokens = ctx.tokens;
            ctx.getValue(CTX_TARGET_REFS).some(t => {
                let tgtk = isToken(t) ? t : lang.getClass(t);
                ctx.setValue(CTX_TARGET_TOKEN, tgtk);
                return tokens.some(tk => {
                    ctx.setValue(CTX_CURR_TOKEN, tk);
                    super.execute(ctx);
                    return !!ctx.instance;
                });
            });

            ctx.remove(CTX_CURR_TOKEN, CTX_TARGET_TOKEN);
        }
        if (!ctx.instance) {
            next && next();
        }
    }

    setup() {
        this.use(RsvSuperServiceAction)
            .use(RsvDecorServiceAction);
    }
}


export const RsvDecorServiceAction = function (ctx: ServiceContext, next: () => void): void {
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

export const RsvSuperServiceAction = function (ctx: ServiceContext, next?: () => void): void {
    let injector = ctx.injector;
    let tgtk = ctx.getValue(CTX_TARGET_TOKEN);
    if (isClassType(tgtk)) {
        ctx.reflects.getExtends(tgtk).some(ty => {
            ctx.instance = injector.resolve({ token: ctx.getValue(CTX_CURR_TOKEN), target: ty, tagOnly: true }, ctx.providers);
            return ctx.instance;
        });
    } else {
        ctx.instance = injector.resolve({ token: ctx.getValue(CTX_CURR_TOKEN), target: tgtk, tagOnly: true }, ctx.providers);
    }

    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};

export const RsvTokenServiceAction = function (ctx: ServiceContext, next: () => void): void {
    let injector = ctx.injector;
    ctx.tokens.some(tk => {
        ctx.instance = injector.resolve(tk, ctx.providers);
        return !!ctx.instance;
    });

    if (!ctx.instance && next) {
        next();
    }
}
