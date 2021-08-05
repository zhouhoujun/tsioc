import { IActionSetup, lang, refl, isFunction, IocActions, Injector, ClassType } from '@tsdi/ioc';
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
        ctx.types = ctx.tokens.map(t => isFunction(t) ? t : injector.getTokenProvider(t)).filter(t => t);

        if (!ctx.match) {
            ctx.match = typeMatch;
        }

        ctx.services = new Map();
        super.execute(ctx);

        next && next();
        // after all.
        if (ctx.services.size < 1) {
            if (ctx.defaultToken) {
                const token = ctx.defaultToken as ClassType;
                if (injector.has(token)) {
                    ctx.services.set(token, { fn: (pdr) => injector.get(token, pdr) });
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
        const { injector, services, types, match } = ctx;
        const state = injector.state();
        let maps: Injector, type;
        ctx.targetRefs.forEach(tk => {
            maps = state.getTypeProvider(tk);
            if (maps && maps.size) {
                maps.iterator((pdr, token) => {
                    type = pdr.type || token;
                    if (isFunction(type) && !services.has(type) && types.some(ty => match(type, ty))) {
                        services.set(type, pdr);
                    }
                });
            }
        });
    }
    if (!ctx.tagOnly) {
        next();
    }
}


export const RsvServicesAction = function (ctx: ServicesContext, next: () => void): void {
    const { injector, services, types, match } = ctx;
    let type;
    injector.iterator((pdr, token) => {
        type = pdr.type || token;
        if (isFunction(type) && !services.has(type) && types.some(ty => match(type, ty))) {
            services.set(type, pdr);
        }
    }, true);

    next();
};
