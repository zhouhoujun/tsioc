import {
    Abstract, AsyncHandler, chain, DefaultTypeRef, DispatchHandler,
    Injector, InvocationContext, isFunction, isObject, isUndefined,
    EMPTY, lang, OperationFactory, Type, TypeRef
} from '@tsdi/ioc';
import { HandleMetadata } from '../metadata/meta';
import { Context } from './context';
import { CanActive } from './guard';


/**
 * abstract middleware implements {@link DispatchHandler}.
 *
 * @export
 * @abstract
 * @class Middleware
 */
@Abstract()
export abstract class Middleware<T extends Context = Context> implements DispatchHandler<T, Promise<void>> {
    /**
     * execute middleware.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract handle(ctx: T, next: () => Promise<void>): Promise<void>;
}

/**
 * is target instance of {@link Middleware}.
 * @param target 
 * @returns is instance of {@link Middleware} or not.
 */
export function isMiddlware(target: any): target is Middleware {
    return target instanceof Middleware || (isObject(target) && isFunction((target as Middleware).handle));
}

/**
 * route instance.
 */
@Abstract()
export abstract class Route extends Middleware {
    /**
     * route url.
     */
    abstract get url(): string;
    /**
     * route guards.
     */
    abstract get guards(): Type<CanActive>[] | undefined;
    /**
     * protocols.
     */
    abstract get protocols(): string[];
}

/**
 * middleware ref.
 */
export class MiddlewareRef<T extends Middleware = Middleware> extends DefaultTypeRef<T> implements Route {
    private metadata: HandleMetadata;
    constructor(factory: OperationFactory<T>, injector: Injector, root: InvocationContext, readonly prefix: string = '', instance?: T) {
        super(factory, injector, root, instance);
        this.metadata = factory.targetReflect.annotation as HandleMetadata;
    }

    async handle(ctx: Context, next: () => Promise<void>): Promise<void> {
        if (isUndefined(this.metadata.route)) {
            return await this.execute(ctx, next);
        }
        if (await this.canActive(ctx)) {
            return await this.execute(ctx, next);
        } else {
            return await next();
        }
    }

    protected execute(ctx: Context, next: () => Promise<void>): Promise<void> {
        return this.instance.handle(ctx, next);
    }

    get url() {
        return this.metadata.route ?? '';
    }

    get guards(): Type<CanActive>[] | undefined {
        return this.metadata.guards;
    }

    private _protocols!: string[];
    get protocols(): string[] {
        if (!this._protocols) {
            this._protocols = this.metadata.protocol?.split(';') ?? EMPTY;
        }
        return this._protocols;
    }


    protected async canActive(ctx: Context): Promise<boolean> {
        if (!((!ctx.status || ctx.status === 404) && ctx.vaild.isActiveRoute(ctx, this.url) === true)) return false;
        if (this.guards && this.guards.length) {
            if (!(await lang.some(
                this.guards.map(token => () => ctx.injector.resolve({ token, regify: true })?.canActivate(ctx)),
                vaild => vaild === false))) return false;
        }
        return true;
    }

}

/**
 * message type for register in {@link Middlewares}.
 */
export type MiddlewareType = AsyncHandler<Context> | Middleware | MiddlewareRef;


/**
 * middlewares, compose of {@link Middleware}.
 */
@Abstract()
export abstract class Middlewares<T extends Context = Context> extends Middleware<T> {
    protected befores: MiddlewareType[] = [];
    protected afters: MiddlewareType[] = [];
    protected handles: MiddlewareType[] = [];
    /**
     * use handle.
     *
     * @param {MiddlewareType} handle
     * @returns {this}
     */
    use(...handles: MiddlewareType[]): this {
        handles.forEach(handle => {
            if (this.has(handle)) return;
            this.handles.push(handle);
        });
        return this;
    }

    unuse(...handles: (MiddlewareType | Type)[]) {
        this.befores = this.filter(this.befores, handles);
        this.handles = this.filter(this.handles, handles);
        this.afters = this.filter(this.afters, handles);
        return this;
    }

    protected filter(target: MiddlewareType[], source: (MiddlewareType | Type)[]) {
        return target.filter(h => source.some(uh => this.equals(h, uh)));
    }

    has(handle: MiddlewareType | Type): boolean {
        return this.befores.some(h => this.equals(h, handle))
            || this.handles.some(h => this.equals(h, handle))
            || this.afters.some(h => this.equals(h, handle));
    }

    /**
     * use handle before
     *
     * @param {MiddlewareType} handle
     * @param {MiddlewareType} before
     * @returns {this}
     */
    useBefore(handle: MiddlewareType): this {
        if (this.has(handle)) {
            return this;
        }
        this.befores.push(handle);
        return this;
    }
    /**
     * use handle after.
     *
     * @param {MiddlewareType} handle
     * @param {MiddlewareType} after
     * @returns {this}
     */
    useAfter(handle: MiddlewareType): this {
        if (this.has(handle)) {
            return this;
        }
        this.afters.push(handle);
        return this;
    }

    override handle(ctx: T, next?: () => Promise<void>): Promise<void> {
        return chain([...this.befores, ...this.handles, ...this.afters], ctx, next);
    }

    protected equals(hd: MiddlewareType, hd2: MiddlewareType | Type) {
        if (hd === hd2) return true;
        if (hd instanceof TypeRef) {
            return hd2 instanceof TypeRef ? hd.type === hd2.type : hd.type === hd2;
        }
        return false;
    }
}


/**
 * abstract router.
 */
@Abstract()
export abstract class Router<T extends Context = Context> extends Middlewares<T> {
    /**
     * can hold protocols.
     */
    abstract get protocols(): string[];
    /**
     * routes.
     */
    abstract get routes(): Map<string, Route>;
    /**
     * add route.
     * @param route 
     */
    abstract route(...route: Route[]): void;
    /**
     * remove route.
     * @param route 
     */
    abstract remove(...route: Route[]): void;
}

/**
 * router resolver
 */
@Abstract()
export abstract class RouterResolver {
    /**
     * resolve router.
     * @param protocol the router protocal. 
     */
    abstract resolve(protocol?: string): Router;
}
