import { isNil, isClass, getClass } from '../utils/chk';
import { InjectReference, isToken } from '../tokens';
import { PROVIDERS } from '../utils/tk';
import { IocActions } from './act';
import { ResolveContext } from './res';

/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubResolveAction, () => new SubResolveAction(container));`
 *
 * @export
 * @abstract
 * @class IocResolveScope
 * @extends {IocActions<T>}
 * @template T
 */
export class IocResolveScope<T extends ResolveContext = ResolveContext> extends IocActions<T> {

    execute(ctx: T, next?: () => void): void {
        if (!ctx.instance) {
            let target = ctx.target;
            if (target) {
                ctx.targetToken = isToken(target) ? target : getClass(target);
            }
            super.execute(ctx);
        }

        if (isNil(ctx.instance) && next) {
            next();
        }

        // after all.
        if (isNil(ctx.instance) && ctx.regify && isClass(ctx.token) && !ctx.injector.has(ctx.token)) {
            ctx.injector.registerType(ctx.token);
            ctx.instance = ctx.injector.get(ctx.token, ctx.providers);
        }
    }

    setup() {
        this.use(
            ResolvePrivateAction,
            ResolveRefAction,
            ResolveInInjectorAction,
            ResolveInProvidersAction,
            ResolveInParentAction,
            ResolveDefaultAction
        );
    }
}


export const ResolveDefaultAction = function (ctx: ResolveContext, next: () => void): void {
    if (isNil(ctx.instance) && ctx.defaultToken) {
        ctx.instance = ctx.injector.get(ctx.defaultToken, ctx.providers);
    }
    if (isNil(ctx.instance)) {
        next();
    }
};

export const ResolveInProvidersAction = function (ctx: ResolveContext, next: () => void): void {
    ctx.instance = ctx.providers.get(ctx.token);
    if (isNil(ctx.instance)) {
        next();
    }
}

export const ResolveInInjectorAction = function (ctx: ResolveContext, next: () => void): void {
    const injector = ctx.injector;
    if (injector.has(ctx.token)) {
        ctx.instance = injector.get(ctx.token, ctx.providers);
    }

    if (isNil(ctx.instance)) {
        next();
    }
};


export const ResolveInParentAction = function (ctx: ResolveContext, next: () => void): void {
    ctx.instance = ctx.injector.parent?.get(ctx.token, ctx.providers);
    if (isNil(ctx.instance)) {
        next();
    }
};

export const ResolvePrivateAction = function (ctx: ResolveContext, next: () => void): void {
    if (ctx.targetToken) {
        const tkn = new InjectReference(PROVIDERS, ctx.targetToken);
        ctx.instance = ctx.injector.get(tkn)?.get(ctx.token, ctx.providers);
    }
    if (isNil(ctx.instance)) {
        next();
    }
};


export const ResolveRefAction = function (ctx: ResolveContext, next: () => void): void {
    if (ctx.targetToken) {
        const tkn = new InjectReference(ctx.token, ctx.targetToken);
        ctx.instance = ctx.injector.get(tkn, ctx.providers);
    }
    if (isNil(ctx.instance) && !ctx.tagOnly) {
        next();
    }
};
