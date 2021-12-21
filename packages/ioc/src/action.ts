import { Token } from './tokens';
import { isBoolean, isFunction } from './utils/chk';
import { chain, DispatchHandler, Handler } from './utils/hdl';
import { isBaseOf } from './utils/lang';
import { Platform } from './injector';


/**
 * action setup.
 */
export interface IActionSetup {
    /**
     * setup action.
     */
    setup(): void;
}

/**
 * ioc action type.
 */
 export type ActionType<T = any> = Token<DispatchHandler<T, void>> | Handler<T, void>;


/**
 * action.
 *
 * @export
 * @abstract
 */
export abstract class Action<T = any, TR = void> implements DispatchHandler<T, TR> {

    /**
     * action handle.
     * @param ctx
     * @param next 
     */
    abstract handle(ctx: T, next?: () => TR): TR;

}



/**
 * actions scope.
 *
 * @export
 * @class IocActions
 * @extends {Action<T>}
 * @template T
 */
export abstract class Actions<T, TR = void> extends Action<T, TR> {

    private _acts: ActionType[];
    private _befs: ActionType[];
    private _afts: ActionType[];
    private _hdlrs: Handler[] | undefined;

    constructor() {
        super();
        this._befs = [];
        this._acts = [];
        this._afts = [];
    }

    has(action: ActionType) {
        return this._acts.indexOf(action) >= 0;
    }

    /**
     * use action.
     *
     * @param {ActionType} action
     * @param {boolean} [setup]  register action type or not.
     * @returns {this}
     */
    use(...actions: ActionType[]): this {
        const len = this._acts.length;
        actions.forEach(action => {
            if (this.has(action)) return;
            this._acts.push(action);
        });
        if (this._acts.length !== len) this.resetHandler();
        return this;
    }

    /**
     * use action before
     *
     * @param {ActionType} action
     * @param {ActionType} [before]
     * @returns {this}
     */
    useBefore(action: ActionType, before?: ActionType): this {
        if (this.has(action)) {
            return this;
        }
        if (before) {
            this._acts.splice(this._acts.indexOf(before), 0, action);
        } else {
            this._acts.unshift(action);
        }
        this.resetHandler();
        return this;
    }

    /**
     * use action after.
     *
     * @param {ActionType} action
     * @param {ActionType} [after]
     * @returns {this}
     */
    useAfter(action: ActionType, after?: ActionType): this {
        if (this.has(action)) {
            return this;
        }
        if (after && !isBoolean(after)) {
            this._acts.splice(this._acts.indexOf(after) + 1, 0, action);
        } else {
            this._acts.push(action);
        }
        this.resetHandler();
        return this;
    }

    /**
     * register actions before run this scope.
     *
     * @param {ActionType} action
     */
    before(action: ActionType): this {
        if (this._befs.indexOf(action) < 0) {
            this._befs.push(action);
            this.resetHandler();
        }
        return this;
    }

    /**
     * register actions after run this scope.
     *
     * @param {ActionType} action
     */
    after(action: ActionType): this {
        if (this._afts.indexOf(action) < 0) {
            this._afts.push(action);
            this.resetHandler();
        }
        return this;
    }

    override handle(ctx: T, next?: () => TR): TR {
        if (!this._hdlrs) {
            const pdr = this.getPlatform(ctx);
            this._hdlrs = [...this._befs, ...this._acts, ...this._afts].map(ac => this.parseHandler(pdr, ac)).filter(f => f);
        }
        return chain(this._hdlrs, ctx, next);
    }

    /**
     * get action provider from context.
     * @param ctx the action context.
     */
    protected abstract getPlatform(ctx: T): Platform;

    /**
     * parse action to handler.
     * @param provider action provider
     * @param ac action.
     */
    protected parseHandler(provider: Platform, ac: any): Handler {
        if (isBaseOf(ac, Action)) {
            if (!provider.hasAction(ac)) {
                provider.registerAction(ac);
            }
            return provider.getHandle(ac)
        } else if (isFunction(ac)) {
            return ac;
        }
        return ac instanceof Action ? ac : null!;
    }

    protected resetHandler() {
        this._hdlrs = null!;
    }

}
