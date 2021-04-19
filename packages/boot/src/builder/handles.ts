import { AsyncHandler, IActionSetup, lang, ActionType, chain, Type, refl, TypeReflect, IActionProvider, Action } from '@tsdi/ioc';
import { IBuildContext } from '../Context';

/**
 * handle interface.
 *
 * @export
 * @interface IBuildHandle
 * @template T
 */
export interface IBuildHandle<T extends IBuildContext = IBuildContext> {
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
    toHandle(): AsyncHandler<T>;
}

/**
 *  handle type.
 */
export type HandleType<T extends IBuildContext = IBuildContext> = ActionType<IBuildHandle<T>, AsyncHandler<T>>;



/**
 * build handle.
 *
 * @export
 * @abstract
 * @class BuildHandle
 * @extends {Handle<T>}
 * @template T
 */
export abstract class BuildHandle<T extends IBuildContext> extends Action implements IBuildHandle<T> {
    constructor() { 
        super();
    }

    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;

    protected execFuncs(ctx: T, handles: AsyncHandler<T>[], next?: () => Promise<void>): Promise<void> {
        return chain(handles, ctx, next);
    }

    private _action: AsyncHandler<T>;
    toHandle(): AsyncHandler<T> {
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
export class BuildHandles<T extends IBuildContext = IBuildContext> extends BuildHandle<T> {

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
        this.resetFuncs();
        return this;
    }

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this.funcs) {
            const pdr = ctx.injector.action();
            this.funcs = this.handles.map(ac => this.parseHandle(pdr, ac)).filter(f => f);
        }
        await this.execFuncs(ctx, this.funcs, next);
    }

    protected resetFuncs() {
        this.funcs = null;
    }

    protected parseHandle(provider: IActionProvider, hdty: HandleType<T>): AsyncHandler<T> {
        if (lang.isBaseOf(hdty, Action) && !provider.has(hdty)) {
            provider.regAction(hdty);
        }
        return provider.getAction<AsyncHandler<T>>(hdty);
    }

}

/**
 * resolve module scope.
 *
 * @export
 * @class ResolveMoudleScope
 * @extends {BuildHandles<IBuildContext>}
 */
export class ResolveScope extends BuildHandles<IBuildContext> implements IActionSetup {

    async execute(ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.value) {
            return;
        }
        const regedState = ctx.injector.state();
        if (ctx.type && !regedState.isRegistered(ctx.type)) {
            ctx.injector.register(ctx.type as Type);
            ctx.injector = regedState.getInjector(ctx.type);
        }
        if (!ctx.reflect) {
            (ctx as { reflect: TypeReflect }).reflect = refl.get(ctx.type);
        }
        // has build module instance.
        await super.execute(ctx);

        if (next) {
            await next();
        }
    }

    setup() {
        this.use(ResolveHandle);
    }
}

export const ResolveHandle = async function (ctx: IBuildContext, next: () => Promise<void>): Promise<void> {
    if (!ctx.value && ctx.type) {
        ctx.value = ctx.injector.resolve(ctx.type, ctx.providers);
    }
    await next();
};
