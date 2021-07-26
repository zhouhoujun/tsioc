import { Token } from './tokens';
import { isBoolean, isFunction } from './utils/chk';
import { chain, Handler } from './utils/hdl';
import { isBaseOf } from './utils/lang';
import { IActionProvider } from './interface';

/**
 * action interface.
 */
export abstract class Action {
    /**
     * pase to handler.
     */
    abstract toHandler(): Handler;
}

/**
 * action setup.
 */
export interface IActionSetup {
    /**
     * setup action.
     */
    setup();
}

/**
 * ioc action type.
 */
export type ActionType<T extends Action = Action, TAction = Handler> = Token<T> | T | TAction;


/**
 * action.
 *
 * @export
 * @abstract
 * @class IocAction
 */
export abstract class IocAction<T, TH extends Handler = Handler<T>, TR = void> extends Action {

    /**
     * execute action.
     * @param ctx
     * @param next 
     */
    abstract execute(ctx: T, next?: () => TR): TR;

    /**
     * execute handler.
     * @param ctx 
     * @param actions 
     * @param next 
     * @returns 
     */
    protected execHandler(ctx: T, actions: TH[], next?: () => TR): TR {
        return chain(actions, ctx, next);
    }

    private _hdr: TH;
    /**
     * parse to handler.
     * @returns 
     */
    toHandler(): TH {
        if (!this._hdr) {
            this._hdr = ((ctx: T, next?: () => TR) => this.execute(ctx, next)) as TH;
        }
        return this._hdr;
    }
}



/**
 * actions scope.
 *
 * @export
 * @class IocActions
 * @extends {IocAction<T>}
 * @template T
 */
export abstract class Actions<T, TA = ActionType, TH extends Handler = Handler<T>, TR = void> extends IocAction<T, TH, TR> {

    private _acts: TA[];
    private _befs: TA[];
    private _afts: TA[];
    private _hdlrs: TH[];

    constructor() {
        super();
        this._befs = [];
        this._acts = [];
        this._afts = [];
    }

    has(action: TA) {
        return this._acts.indexOf(action) >= 0;
    }

    /**
     * use action.
     *
     * @param {TA} action
     * @param {boolean} [setup]  register action type or not.
     * @returns {this}
     */
    use(...actions: TA[]): this {
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
     * @param {TA} action
     * @param {TA} [before]
     * @returns {this}
     */
    useBefore(action: TA, before?: TA): this {
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
     * @param {TA} action
     * @param {TA} [after]
     * @returns {this}
     */
    useAfter(action: TA, after?: TA): this {
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
     * @param {TA} action
     */
    before(action: TA): this {
        if (this._befs.indexOf(action) < 0) {
            this._befs.push(action);
            this.resetHandler();
        }
        return this;
    }

    /**
     * register actions after run this scope.
     *
     * @param {TA} action
     */
    after(action: TA): this {
        if (this._afts.indexOf(action) < 0) {
            this._afts.push(action);
            this.resetHandler();
        }
        return this;
    }

    execute(ctx: T, next?: () => TR): TR {
        if (!this._hdlrs) {
            const pdr = this.getActionProvider(ctx);
            this._hdlrs = [...this._befs, ...this._acts, ...this._afts].map(ac => this.parseHandler(pdr, ac)).filter(f => f);
        }
        return this.execHandler(ctx, this._hdlrs, next);
    }

    /**
     * get action provider from context.
     * @param ctx the action context.
     */
    protected abstract getActionProvider(ctx: T): IActionProvider;

    /**
     * parse action to handler.
     * @param provider action provider
     * @param ac action.
     */
    protected parseHandler(provider: IActionProvider, ac: any): TH {
        if (isBaseOf(ac, Action)) {
            if (!provider.has(ac)) {
                provider.regAction(ac);
            }
            return provider.getAction(ac)
        } else if (isFunction(ac)) {
            return ac as TH;
        }
        return ac instanceof Action ? ac.toHandler() as TH : null;
    }

    protected resetHandler() {
        this._hdlrs = null;
    }

}
