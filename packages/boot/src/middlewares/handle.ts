import { Abstract, AsyncHandler, chain, ClassType, Inject, Injector, INJECTOR, isFunction, lang, Type } from '@tsdi/ioc';
import { MsgContext } from './ctx';



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
     * @param {MsgContext} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    abstract execute(ctx: MsgContext, next: () => Promise<void>): Promise<void>;

    private _action: AsyncHandler<MsgContext>;
    toAction(): AsyncHandler<MsgContext> {
        if (!this._action) {
            this._action = (ctx: MsgContext, next?: () => Promise<void>) => this.execute(ctx, next);
        }
        return this._action;
    }

    protected execFuncs(ctx: MsgContext, handles: AsyncHandler<MsgContext>[], next?: () => Promise<void>): Promise<void> {
        return chain(handles, ctx, next);
    }
}

/**
 * message type.
 */
export type MiddlewareType = AsyncHandler<MsgContext> | Middleware | Type<Middleware>;


@Abstract()
export abstract class Middlewares extends Middleware {
    protected handles: MiddlewareType[] = [];
    private funcs: AsyncHandler<MsgContext>[];

    @Inject(INJECTOR)
    private _injector: Injector;

    /**
     * get injector of current message queue.
     */
    getInjector(): Injector {
        return this._injector;
    }

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
            this.regHandle(handle);
        });
        if (this.handles.length !== len) this.resetFuncs();
        return this;
    }

    unuse(...handles: MiddlewareType[]) {
        const len = this.handles.length;
        handles.forEach(handle => {
            lang.remove(this.handles, handle);
        });
        if (this.handles.length !== len) this.resetFuncs();

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
        this.regHandle(handle);
        this.resetFuncs();
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
        this.regHandle(handle);
        this.resetFuncs();
        return this;
    }

    async execute(ctx: MsgContext, next?: () => Promise<void>): Promise<void> {
        if (!this.funcs) {
            this.funcs = this.handles.map(ac => this.toHandle(ac)).filter(f => f);
        }
        await this.execFuncs(ctx, this.funcs, next);
    }

    protected resetFuncs() {
        this.funcs = null;
    }

    protected regHandle(handle: MiddlewareType): this {
        lang.isBaseOf(handle, Middleware) && this.getInjector().registerType(handle);
        return this;
    }

    protected toHandle(handleType: MiddlewareType): AsyncHandler<MsgContext> {
        if (handleType instanceof Middleware) {
            return handleType.toAction();
        } else if (lang.isBaseOf(handleType, Middleware)) {
            const handle = this.getInjector().get(handleType) ?? this.getInjector().getContainer().regedState.getInjector(handleType as ClassType)?.get(handleType);
            return handle?.toAction?.();
        } else if (isFunction(handleType)) {
            return handleType as AsyncHandler<MsgContext>;
        }
        return null;
    }
}