import { ResolveContext, IResolveContext } from './ResolveContext';
import { isNullOrUndefined, lang, isClass } from '../utils/lang';
import { CTX_DEFAULT_TOKEN, CTX_TARGET_TOKEN } from '../context-tokens';
import { InjectReference } from '../InjectReference';
import { PROVIDERS } from '../IInjector';
import { IocCompositeAction } from './IocCompositeAction';
import { isToken } from '../utils/isToken';


/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubResolveAction, () => new SubResolveAction(container));`
 *
 * @export
 * @abstract
 * @class IocResolveScope
 * @extends {IocCompositeAction<T>}
 * @template T
 */
export class IocResolveScope<T extends IResolveContext = IResolveContext> extends IocCompositeAction<T> {

    execute(ctx: T, next?: () => void): void {
        if (!ctx.instance) {
            let target = ctx.getOptions().target;
            if (target) {
                ctx.setValue(CTX_TARGET_TOKEN, isToken(target) ? target : lang.getClass(target));
            }
            super.execute(ctx);
        }

        if (isNullOrUndefined(ctx.instance) && next) {
            next();
        }

        // after all.
        if (isNullOrUndefined(ctx.instance) && ctx.getOptions().regify && isClass(ctx.token) && !ctx.injector.has(ctx.token)) {
            ctx.injector.registerType(ctx.token);
            ctx.instance = ctx.injector.get(ctx.token, ctx.providers);
        }
    }

    setup() {
        this.use(ResolvePrivateAction)
            .use(ResolveRefAction)
            .use(ResolveInInjectorAction)
            .use(ResolveInProvidersAction)
            .use(ResolveInRootAction)
            .use(ResolveDefaultAction);
    }
}


export const ResolveDefaultAction = function (ctx: ResolveContext, next: () => void): void {
    if (isNullOrUndefined(ctx.instance) && ctx.hasValue(CTX_DEFAULT_TOKEN)) {
        ctx.instance = ctx.injector.get(ctx.defaultToken, ctx.providers);
    }
    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};

export const ResolveInProvidersAction = function (ctx: ResolveContext, next: () => void): void {
    if (ctx.providers.has(ctx.token)) {
        ctx.instance = ctx.providers.get(ctx.token);
    }
    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
}

export const ResolveInInjectorAction = function (ctx: ResolveContext, next: () => void): void {
    let injector = ctx.injector;
    if (injector.has(ctx.token)) {
        ctx.instance = injector.get(ctx.token, ctx.providers);
    }

    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};


export const ResolveInRootAction = function (ctx: ResolveContext, next: () => void): void {
    let container = ctx.getContainer();
    if (container.has(ctx.token)) {
        ctx.instance = container.get(ctx.token, ctx.providers);
    }
    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};

export const ResolvePrivateAction = function (ctx: ResolveContext, next: () => void): void {
    if (ctx.hasValue(CTX_TARGET_TOKEN)) {
        let tk = new InjectReference(PROVIDERS, ctx.getValue(CTX_TARGET_TOKEN));
        let privPdr = ctx.injector.get(tk);
        if (privPdr && privPdr.has(ctx.token)) {
            ctx.instance = privPdr.get(ctx.token, ctx.providers);
        }
    }
    if (isNullOrUndefined(ctx.instance)) {
        next();
    }
};


export const ResolveRefAction = function (ctx: ResolveContext, next: () => void): void {
    if (ctx.hasValue(CTX_TARGET_TOKEN)) {
        let tk = new InjectReference(ctx.token, ctx.getValue(CTX_TARGET_TOKEN));
        ctx.instance = ctx.injector.get(tk, ctx.providers);
    }
    if (isNullOrUndefined(ctx.instance) && !ctx.getOptions().tagOnly) {
        next();
    }
};
