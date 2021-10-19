import { Abstract, AsyncHandler, chain, isFunction, lang, RegisteredState, Type, TypeReflect } from '@tsdi/ioc';
import { Context } from './context';
import { CanActive } from './guard';


export interface IMiddleware<T extends Context = Context> {
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

export function isMiddlwareType(target: any): target is Type<IMiddleware> {
    return isFunction(target)
        && (
            (isFunction(Object.getOwnPropertyDescriptor(target, 'execute')?.value)
                && isFunction(Object.getOwnPropertyDescriptor(target, 'toHandle')?.value))
            || lang.isBaseOf(target, Middleware));
}

/**
 * middleware handle.
 *
 * @export
 * @abstract
 * @class MessageHandle
 * @extends {Middleware<Context>}
 */
@Abstract()
export abstract class Middleware<T extends Context = Context> implements IMiddleware<T> {
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

/**
 * message type.
 */
export type MiddlewareType = AsyncHandler<Context> | Middleware | Type<IMiddleware>;

/**
 * middlewares.
 */
@Abstract()
export abstract class Middlewares<T extends Context = Context> extends Middleware<T> {
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

    override async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this.funcs) {
            const state = ctx.injector.state();
            this.funcs = this.handles.map(ac => this.parseHandle(state, ac)).filter(f => f);
        }
        await chain( this.funcs, ctx, next);
    }

    protected resetHandler() {
        this.funcs = null!;
    }

    /**
     * pase middleware to handler.
     * @param state global registered state.
     * @param mdty mdiddleware type.
     */
    protected abstract parseHandle(state: RegisteredState, mdty: MiddlewareType): AsyncHandler<T>;
}


/**
 * router interface
 */
export interface IRouter<T extends Context = Context> extends Middlewares<T> {
    readonly url: string;
    getPath(): string;
}



/**
 * route info.
 */
export class RouteInfo {
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
        return new RouteInfo(url, prefix, guards, protocol);
    }

    static createProtocol(protocol: string, prefix: string = '', guards?: Type<CanActive>[]) {
        return new RouteInfo('', prefix, guards, protocol);
    }
}

/**
 * middleware handle route reflect.
 */
export interface RouteReflect extends TypeReflect {
    route?: RouteInfo;
}
