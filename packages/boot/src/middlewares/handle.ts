import { Abstract, AsyncHandler, chain, lang, RegisteredState, tokenId, Type, TypeReflect } from '@tsdi/ioc';
import { MessageContext } from './ctx';



/**
 * middleware handle.
 *
 * @export
 * @abstract
 * @class MessageHandle
 * @extends {Middleware<MessageContext>}
 */
@Abstract()
export abstract class Middleware {
    /**
     * execute middleware.
     *
     * @abstract
     * @param {MessageContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract execute(ctx: MessageContext, next: () => Promise<void>): Promise<void>;

    private _hdl: AsyncHandler<MessageContext>;
    /**
     * parse this middleware to handler.
     */
    toHandle(): AsyncHandler<MessageContext> {
        if (!this._hdl) {
            this._hdl = (ctx: MessageContext, next?: () => Promise<void>) => this.execute(ctx, next);
        }
        return this._hdl;
    }

    /**
     * exec handlers.
     * @param ctx exection context.
     * @param handles 
     * @param next 
     * @returns 
     */
    protected execHandler(ctx: MessageContext, handles: AsyncHandler<MessageContext>[], next?: () => Promise<void>): Promise<void> {
        return chain(handles, ctx, next);
    }
}

/**
 * message type.
 */
export type MiddlewareType = AsyncHandler<MessageContext> | Middleware | Type<Middleware>;

/**
 * middlewares.
 */
@Abstract()
export abstract class Middlewares extends Middleware {
    protected handles: MiddlewareType[] = [];
    private funcs: AsyncHandler<MessageContext>[];

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

    unuse(...handles: MiddlewareType[]) {
        const len = this.handles.length;
        handles.forEach(handle => {
            lang.remove(this.handles, handle);
        });
        if (this.handles.length !== len) this.resetHandler();

        return this;
    }

    has(handle: MiddlewareType): boolean {
        return this.handles.indexOf(handle) >= 0;
    }

    /**
     * use handle before
     *
     * @param {MiddlewareType} handle
     * @param {MiddlewareType} before
     * @returns {this}
     */
    useBefore(handle: MiddlewareType, before: MiddlewareType): this {
        if (this.has(handle)) {
            return this;
        }
        if (before) {
            this.handles.splice(this.handles.indexOf(before), 0, handle);
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
    useAfter(handle: MiddlewareType, after?: MiddlewareType): this {
        if (this.has(handle)) {
            return this;
        }
        if (after) {
            this.handles.splice(this.handles.indexOf(after) + 1, 0, handle);
        } else {
            this.handles.push(handle);
        }
        this.resetHandler();
        return this;
    }

    async execute(ctx: MessageContext, next?: () => Promise<void>): Promise<void> {
        if (!this.funcs) {
            const state = ctx.injector.state(); 
            this.funcs = this.handles.map(ac => this.parseHandle(state, ac)).filter(f => f);
        }
        await this.execHandler(ctx, this.funcs, next);
    }

    protected resetHandler() {
        this.funcs = null;
    }

    /**
     * pase middleware to handler.
     * @param state global registered state.
     * @param mdty mdiddleware type.
     */
    protected abstract parseHandle(state: RegisteredState, mdty: MiddlewareType): AsyncHandler<MessageContext>;
}


/**
 * router interface
 */
export interface IRouter extends Middlewares {
    readonly url: string;
    getPath(): string;
}

/**
 * middleware handle route reflect.
 */
export interface RouteReflect extends TypeReflect {
    route_url?: string;
    route_prefix?: string;
}

export const ROUTE_PROTOCOL = tokenId<string>('ROUTE_PROTOCOL');
/**
 * route url token.
 */
export const ROUTE_URL = tokenId<string>('ROUTE_URL');
/**
 * route prefix token.
 */
export const ROUTE_PREFIX = tokenId<string>('ROUTE_PREFIX');