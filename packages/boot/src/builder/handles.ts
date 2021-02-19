import { AsyncHandler, IActionSetup, Inject, INJECTOR, Injector, Action, lang, ActionType, chain } from '@tsdi/ioc';
import { IAnnoationContext, IBuildContext } from '../Context';

/**
 * handle interface.
 *
 * @export
 * @interface IBuildHandle
 * @template T
 */
export interface IBuildHandle<T = any> {
    /**
     * execute handle.
     *
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     */
    execute(ctx: T, next?: () => Promise<void>): Promise<void>;

    /**
     * to action.
     *
     * @returns {AsyncHandler<T>}
     */
    toAction(): AsyncHandler<T>;
}

/**
 *  handle type.
 */
export type HandleType<T = any> = ActionType<IBuildHandle<T>, AsyncHandler<T>>;



/**
 * build handle.
 *
 * @export
 * @abstract
 * @class BuildHandle
 * @extends {Handle<T>}
 * @template T
 */
export abstract class BuildHandle<T extends IAnnoationContext = IBuildContext> extends Action implements IBuildHandle<T> {
    constructor(@Inject() protected readonly injector: Injector) {
        super();
    }

    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;

    protected execFuncs(ctx: T, handles: AsyncHandler<T>[], next?: () => Promise<void>): Promise<void> {
        return chain(handles, ctx, next);
    }

    private _action: AsyncHandler<T>;
    toAction(): AsyncHandler<T> {
        if (!this._action) {
            this._action = (ctx: T, next?: () => Promise<void>) => this.execute(ctx, next);
        }
        return this._action;
    }
}

/**
 * composite build handles.
 *
 * @export
 * @class BuildHandles
 * @extends {Handles<T>}
 * @template T
 */
export class BuildHandles<T extends IAnnoationContext = IBuildContext> extends BuildHandle<T> {

    protected handles: HandleType<T>[] = [];
    private funcs: AsyncHandler<T>[];


    /**
     * use handle.
     *
     * @param {HandleType} handle
     * @returns {this}
     */
    use(...handles: HandleType<T>[]): this {
        const len = this.handles.length;
        handles.forEach(handle => {
            if (this.has(handle)) return;
            this.handles.push(handle);
            this.regHandle(handle);
        });
        if (this.handles.length !== len) this.resetFuncs();
        return this;
    }

    unuse(...handles: HandleType<T>[]) {
        const len = this.handles.length;
        handles.forEach(handle => {
            lang.remove(this.handles, handle);
        });
        if (this.handles.length !== len) this.resetFuncs();

        return this;
    }

    has(handle: HandleType<T>): boolean {
        return this.handles.indexOf(handle) >= 0;
    }

    /**
     * use handle before
     *
     * @param {HandleType} handle
     * @param {HandleType} before
     * @returns {this}
     */
    useBefore(handle: HandleType<T>, before: HandleType<T>): this {
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
     * @param {HandleType} handle
     * @param {HandleType} after
     * @returns {this}
     */
    useAfter(handle: HandleType<T>, after?: HandleType<T>): this {
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

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this.funcs) {
            this.funcs = this.handles.map(ac => this.toHandle(ac)).filter(f => f);
        }
        await this.execFuncs(ctx, this.funcs, next);
    }

    protected resetFuncs() {
        this.funcs = null;
    }

    protected toHandle(handleType: HandleType<T>): AsyncHandler<T> {
        return this.injector.getContainer().provider.getAction<AsyncHandler<T>>(handleType);
    }

    protected regHandle(handle: HandleType<T>): this {
        lang.isBaseOf(handle, Action) && this.injector.getContainer().provider.regAction(handle);
        return this;
    }
}

/**
 * resolve handle.
 */
export abstract class ResolveHandle extends BuildHandle<IBuildContext> { }

/**
 * resolve module scope.
 *
 * @export
 * @class ResolveMoudleScope
 * @extends {BuildHandles<IBuildContext>}
 */
export class ResolveMoudleScope extends BuildHandles<IBuildContext> implements IActionSetup {

    async execute(ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.value) {
            return;
        }
        const regedState = ctx.getContainer().regedState;
        if (ctx.type && !regedState.isRegistered(ctx.type)) {
            ctx.injector.register(ctx.type);
            ctx.setValue(INJECTOR, regedState.getInjector(ctx.type))
        }
        // has build module instance.
        await super.execute(ctx);

        if (next) {
            await next();
        }
        // after all clean.
        setTimeout(() => ctx.destroy());
    }

    setup() {
        this.use(ResolveModuleHandle);
    }
}

export const ResolveModuleHandle = async function (ctx: IBuildContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.value && ctx.type) {
        ctx.value = ctx.injector.resolve(ctx.type, ctx.providers);
    }
    await next();
};
