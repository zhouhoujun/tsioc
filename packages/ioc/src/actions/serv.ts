import { IActionSetup } from '../action';
import { FnRecord, Injector } from '../injector';
import { get } from '../metadata/refl';
import { Token } from '../tokens';
import { ClassType, Type } from '../types';
import { isFunction } from '../utils/chk';
import { getParentClass, isBaseOf, isExtendsClass } from '../utils/lang';
import { IocActions } from './act';
import { IocContext } from './ctx';


/**
 * resolve services context.
 */
export interface ServicesContext extends IocContext {
    /**
    * service tokens.
    *
    * @type {Type}
    * @memberof ResolveServiceContext
    */
    token: Token;
    /**
     * resolve token in target context.
     */
    target?: Token | Object | (Token | Object)[];

    targetRefs?: ClassType[];

    /**
     * types.
     */
    type: ClassType;

    /**
     * types matchs.
     */
    match: (tag: ClassType, base: ClassType) => boolean;

    /**
     * all matched services map.
     *
     * @type {Injector}
     */
    services: Map<ClassType, FnRecord>;

    /**
     * only for target private or ref token. if has target.
     */
    tagOnly?: boolean;
    /**
     * all faild use the default token to get instance.
     */
    defaultToken?: Token;

}


/**
 * default service type match.
 * @param tag
 * @param base
 */
const typeMatch = (tag: ClassType, base: ClassType) => getParentClass(base) ? get(tag)?.class.isExtends(base) ?? isExtendsClass(tag, base) : isBaseOf(tag, base);

// services actions
export class ResolveServicesScope extends IocActions implements IActionSetup {

    override execute(ctx: ServicesContext, next?: () => void): void {
        if (!ctx.token) {
            return;
        }
        const injector = ctx.injector;
        ctx.type = isFunction(ctx.token) ? ctx.token : injector.getTokenProvider(ctx.token);

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
                    ctx.services.set(token, { fn: (pdr: Injector) => injector.get(token, pdr) });
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
        const { injector, services, type, match } = ctx;
        const platfrom = injector.platform();
        let maps: Injector, dtype: Type;
        ctx.targetRefs.forEach(tk => {
            maps = platfrom.getTypeProvider(tk);
            if (maps && maps.size) {
                maps.iterator((pdr, token) => {
                    dtype = pdr.type || token as Type;
                    if (isFunction(dtype) && !services.has(dtype) && match(dtype, type)) {
                        services.set(dtype, pdr);
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
    const { injector, services, type, match } = ctx;
    let dtype: Type;
    injector.iterator((pdr, token) => {
        dtype = pdr.type || token as Type;
        if (isFunction(dtype) && !services.has(dtype) && match(dtype, type)) {
            services.set(dtype, pdr);
        }
    }, true);

    next();
};
