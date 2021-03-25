import { isNil, getClass, isFunction, isTypeObject } from '../utils/chk';
import { Token, tokenRef } from '../tokens';
import { IocActions } from './act';
import { ResolveContext } from './res';
import { Type } from '../types';

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
            if (ctx.target) {
                ctx.targetToken = isTypeObject(ctx.target) ? getClass(ctx.target) : ctx.target as Token;
            }
            super.execute(ctx);
        }

        if (isNil(ctx.instance) && next) {
            next();
        }

        // after all.
        if (isNil(ctx.instance) && ctx.regify && isFunction(ctx.token) && !ctx.injector.has(ctx.token)) {
            ctx.injector.register(ctx.token as Type);
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
    if (ctx.injector.has(ctx.token)) {
        ctx.instance = ctx.injector.get(ctx.token, ctx.providers);
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
        ctx.instance = ctx.injector.getContainer().regedState.getTypeProvider(ctx.targetToken as Type)?.get(ctx.token, ctx.providers);
    }
    if (isNil(ctx.instance)) {
        next();
    }
};


export const ResolveRefAction = function (ctx: ResolveContext, next: () => void): void {
    if (ctx.targetToken) {
        ctx.instance = ctx.injector.get(tokenRef(ctx.token, ctx.targetToken), ctx.providers);
    }
    if (isNil(ctx.instance) && !ctx.tagOnly) {
        next();
    }
};
