import { IActionSetup, lang, refl, isFunction, isTypeObject, tokenRef, IocActions, createProvider, IProvider } from '@tsdi/ioc';
import { ServicesContext } from './context';

/**
 * default service type match.
 * @param tag
 * @param base
 */
const typeMatch = (tag, base) => lang.getParentClass(base) ? refl.get(tag)?.class.isExtends(base) ?? lang.isExtendsClass(tag, base) : lang.isBaseOf(tag, base);

// services actions
export class ResolveServicesScope extends IocActions implements IActionSetup {

    execute(ctx: ServicesContext, next?: () => void): void {
        if (!ctx.tokens || !ctx.tokens.length) {
            return;
        }
        const injector = ctx.injector;
        ctx.types = ctx.tokens.map(t => isFunction(t)? t: injector.getTokenProvider(t)).filter(t=> t);

        if (!ctx.match) {
            ctx.match = typeMatch;
        }

        ctx.services = createProvider(injector.getContainer());
        super.execute(ctx);

        next && next();
        // after all.
        if (ctx.services.size < 1) {
            if (ctx.defaultToken) {
                const key = ctx.defaultToken;
                const injector = ctx.injector;
                if (injector.has(key, true)) {
                    ctx.services.set(key, (pdr: IProvider) => injector.get(key, pdr));
                }
            }
        }
    }

    setup() {
        this.use(RsvSuperServicesAction, RsvServicesAction);
    }
}



export const RsvSuperServicesAction = function (ctx: ServicesContext, next: () => void): void {
    if (ctx.targetRefs && ctx.targetRefs.length) {
        const { injector: injector, services, types, match } = ctx;
        const state = injector.state();
        ctx.targetRefs.forEach(t => {
            const tk = isTypeObject(t) ? lang.getClass(t) : t;
            const maps = state.getTypeProvider(tk);
            if (maps && maps.size) {
                maps.iterator((pdr, t1) => {
                    if (!services.has(t1)
                        && (
                            (isFunction(t1) && types.some(ty => match(t1, ty)))
                            || (pdr.type && types.some(ty => match(pdr.type, ty)))
                        )
                    ) {
                        services.set(t1, pdr);
                    }
                });
            }

            ctx.types.forEach(ty => {
                const reftk = tokenRef(ty, tk);
                if (injector.has(reftk)) {
                    services.set(reftk, (pdr: IProvider) => injector.get(reftk, pdr))
                }
            });
        });
    }
    if (!ctx.tagOnly) {
        next();
    }
};


export const RsvServicesAction = function (ctx: ServicesContext, next: () => void): void {
    const { services, types, match } = ctx;
    ctx.injector.iterator((pdr, tk) => {
        if (!services.has(tk)
            && (
                (isFunction(tk) && types.some(ty => match(tk, ty)))
                || (pdr.type && types.some(ty => match(pdr.type, ty)))
            )
        ) {
            services.set(tk, pdr);
        }
    }, true);

    next();
};
