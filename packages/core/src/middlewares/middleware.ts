import { Abstract, AsyncHandler, chain, isFunction, isObject, isResolver, lang, Resolver, Type, TypeReflect } from '@tsdi/ioc';
import { Context } from './context';
import { CanActive } from './guard';

/**
 * middleware interface.
 */
export interface Middleware<T extends Context = Context> {
    /**
     * execute middleware.
     * @param ctx 
     * @param next 
     */
    execute(ctx: T, next: () => Promise<void>): Promise<void>;
    /**
     * parse this middleware to handler.
     */
    toHandle(): AsyncHandler<T>
}

/**
 * is target instance of {@link Middleware}.
 * @param target 
 * @returns is instance of {@link Middleware} or not.
 */
export function isMiddlware(target: any): target is Middleware {
    return isObject(target) && isFunction((target as Middleware).execute) && isFunction((target as Middleware).toHandle);
}


/**
 * abstract middleware implements {@link Middleware}.
 *
 * @export
 * @abstract
 * @class AbstractMiddleware
 */
@Abstract()
export abstract class AbstractMiddleware<T extends Context = Context> implements Middleware<T> {
    /**
     * execute middleware.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;

    private _hdl!: AsyncHandler<T>;
    /**
     * parse this middleware to handler.
     */
    toHandle(): AsyncHandler<T> {
        if (!this._hdl) {
            this._hdl = (ctx: T, next: () => Promise<void>) => this.execute(ctx, next);
        }
        return this._hdl;
    }
}

export interface RouteResolver<T = any> extends Resolver<T> {
    route?: Route;
}

/**
 * is resolver or not.
 * @param target 
 * @returns 
 */
 export function isRouteResolver(target: any): target is RouteResolver {
    if (!isObject(target)) return false;
    return isFunction((target as Resolver).type) && (target as RouteResolver).route instanceof Route && isFunction((target as Resolver).resolve);
}

/**
 * message type for register in {@link Middlewares}.
 */
export type MiddlewareType = AsyncHandler<Context> | Middleware | RouteResolver<Middleware>;


/**
 * middlewares, compose of {@link Middleware}.
 */
@Abstract()
export abstract class Middlewares<T extends Context = Context> extends AbstractMiddleware<T> {
    protected handles: MiddlewareType[] = [];
    private funcs!: AsyncHandler<T>[];

    /**
     * use handle.
     *
     * @param {MiddlewareType} handle
     * @returns {this}
     */
    use(...handles: MiddlewareType[]): this {
        const len = this.handles.length;
        handles.forEach(handle => {
            if (this.has(handle)) return;
            this.handles.push(handle);
        });
        if (this.handles.length !== len) this.resetHandler();
        return this;
    }

    unuse(...handles: (MiddlewareType | Type)[]) {
        const len = this.handles.length;
        handles.forEach(handle => {
            lang.remove(this.handles, handle);
        });
        this.handles = this.handles.filter(h => handles.some(uh => this.equals(h, uh)));
        if (this.handles.length !== len) this.resetHandler();
        return this;
    }



    has(handle: MiddlewareType | Type): boolean {
        return this.handles.some(h => this.equals(h, handle));
    }

    /**
     * use handle before
     *
     * @param {MiddlewareType} handle
     * @param {MiddlewareType} before
     * @returns {this}
     */
    useBefore(handle: MiddlewareType, before: MiddlewareType | Type): this {
        if (this.has(handle)) {
            return this;
        }
        if (before) {
            this.handles.splice(this.handles.findIndex(h => this.equals(h, before)), 0, handle);
        } else {
            this.handles.unshift(handle);
        }
        this.resetHandler();
        return this;
    }
    /**
     * use handle after.
     *
     * @param {MiddlewareType} handle
     * @param {MiddlewareType} after
     * @returns {this}
     */
    useAfter(handle: MiddlewareType, after?: MiddlewareType | Type): this {
        if (this.has(handle)) {
            return this;
        }
        if (after) {
            this.handles.splice(this.handles.findIndex(h => this.equals(h, after)) + 1, 0, handle);
        } else {
            this.handles.push(handle);
        }
        this.resetHandler();
        return this;
    }

    override async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this.funcs) {
            this.funcs = this.handles.map(ac => this.parseHandle(ac)!).filter(f => f);
        }
        await chain(this.funcs, ctx, next);
    }

    protected resetHandler() {
        this.funcs = null!;
    }

    /**
     * pase middleware to handler.
     * @param platform global platform.
     * @param mdty mdiddleware type.
     */
    protected parseHandle(mdty: MiddlewareType): AsyncHandler<T> | undefined {
        if (isFunction(mdty)) {
            return mdty;
        } else if (isMiddlware(mdty)) {
            return mdty.toHandle();
        } else if (isResolver(mdty)) {
            return mdty.resolve()?.toHandle();
        }
    }

    protected equals(hd: MiddlewareType, hd2: MiddlewareType | Type) {
        if (isFunction(hd2)) {
            return isFunction(hd) ? hd === hd2 : (isResolver(hd) ? hd.type === hd2 : false);
        } else if (isResolver(hd2)) {
            return isResolver(hd) ? hd.type === hd2.type : false;
        }
        return hd === hd2;
    }
}


/**
 * abstract router.
 */
@Abstract()
export abstract class AbstractRouter<T extends Context = Context> extends Middlewares<T> {
    abstract get url(): string;
    abstract getPath(): string;
}


/**
 * route.
 */
export class Route {
    constructor(readonly url: string = '', readonly prefix: string = '', readonly guards?: Type<CanActive>[], readonly protocol: string = '') {

    }

    private _protocols!: string[];
    get protocols(): string[] {
        if (!this._protocols) {
            this._protocols = this.protocol.split(';');
        }
        return this._protocols;
    }

    static create(url: string = '', prefix: string = '', guards?: Type<CanActive>[], protocol: string = '') {
        return new Route(url, prefix, guards, protocol);
    }

    static createProtocol(protocol: string, prefix: string = '', guards?: Type<CanActive>[]) {
        return new Route('', prefix, guards, protocol);
    }
}

/**
 * middleware handle route reflect.
 */
export interface RouteReflect extends TypeReflect {
    route?: Route;
}
