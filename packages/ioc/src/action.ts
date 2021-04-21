import { IActionProvider } from './IInjector';
import { Token } from './tokens';
import { isBoolean, isFunction } from './utils/chk';
import { chain, Handler } from './utils/hdl';
import { isBaseOf } from './utils/lang';

/**
 * action interface.
 */
export abstract class Action {

    constructor() { }

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

    private acts: TA[];
    private befs: TA[];
    private afts: TA[];
    private hdlrs: TH[];

    constructor() {
        super();
        this.befs = [];
        this.acts = [];
        this.afts = [];
    }

    has(action: TA) {
        return this.acts.indexOf(action) >= 0;
    }

    /**
     * use action.
     *
     * @param {TA} action
     * @param {boolean} [setup]  register action type or not.
     * @returns {this}
     */
    use(...actions: TA[]): this {
        const len = this.acts.length;
        actions.forEach(action => {
            if (this.has(action)) return;
            this.acts.push(action);
        });
        if (this.acts.length !== len) this.resetHandler();
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
            this.acts.splice(this.acts.indexOf(before), 0, action);
        } else {
            this.acts.unshift(action);
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
            this.acts.splice(this.acts.indexOf(after) + 1, 0, action);
        } else {
            this.acts.push(action);
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
        if (this.befs.indexOf(action) < 0) {
            this.befs.push(action);
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
        if (this.afts.indexOf(action) < 0) {
            this.afts.push(action);
            this.resetHandler();
        }
        return this;
    }

    execute(ctx: T, next?: () => TR): TR {
        if (!this.hdlrs) {
            const pdr = this.getActionProvider(ctx);
            this.hdlrs = [...this.befs, ...this.acts, ...this.afts].map(ac => this.parseHandler(pdr, ac)).filter(f => f);
        }
        return this.execHandler(ctx, this.hdlrs, next);
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
        this.hdlrs = null;
    }

}
