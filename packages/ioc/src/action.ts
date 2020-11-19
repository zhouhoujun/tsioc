import { Token } from './tokens';
import { chain, Handler, isBoolean } from './utils/lang';

/**
 * action interface.
 */
export abstract class Action {

    constructor() { }

    abstract toAction(): Handler;
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
export abstract class IocAction<T> extends Action {

    abstract execute(ctx: T, next: () => void): void;

    protected execFuncs(ctx: T, actions: Handler[], next?: () => void) {
        chain(actions, ctx, next);
    }

    private _action: Handler;
    toAction(): Handler {
        if (!this._action) {
            this._action = (ctx: T, next?: () => void) => this.execute(ctx, next);
        }
        return this._action;
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
export abstract class Actions<T> extends IocAction<T> {

    protected actions: ActionType[];
    protected befores: ActionType[];
    protected afters: ActionType[];
    private handlers: Handler[];

    constructor() {
        super();
        this.befores = [];
        this.actions = [];
        this.afters = [];
    }

    has(action: ActionType) {
        return this.actions.indexOf(action) >= 0;
    }

    /**
     * use action.
     *
     * @param {ActionType} action
     * @param {boolean} [setup]  register action type or not.
     * @returns {this}
     */
    use(...actions: ActionType[]): this {
        actions.forEach(action => {
            if (this.has(action)) {
                return this;
            }
            this.actions.push(action);
        });
        this.regAction(...actions);
        this.resetFuncs();
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
            this.actions.splice(this.actions.indexOf(before), 0, action);
        } else {
            this.actions.unshift(action);
        }
        this.regAction(action);
        this.resetFuncs();
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
            this.actions.splice(this.actions.indexOf(after) + 1, 0, action);
        } else {
            this.actions.push(action);
        }
        this.regAction(action);
        this.resetFuncs();
        return this;
    }

    /**
     * register actions before run this scope.
     *
     * @param {ActionType} action
     */
    before(action: ActionType): this {
        if (this.befores.indexOf(action) < 0) {
            this.befores.push(action);
            this.regAction(action);
            this.resetFuncs();
        }
        return this;
    }

    /**
     * register actions after run this scope.
     *
     * @param {ActionType} action
     */
    after(action: ActionType): this {
        if (this.afters.indexOf(action) < 0) {
            this.afters.push(action);
            this.regAction(action);
            this.resetFuncs();
        }
        return this;
    }

    execute(ctx: T, next?: () => void): void {
        if (!this.handlers) {
            this.handlers = [...this.befores, ...this.actions, ...this.afters].map(ac => this.toHandle(ac)).filter(f => f);
        }
        this.execFuncs(ctx, this.handlers, next);
    }

    protected abstract regAction(...ac: any[]);

    protected abstract toHandle(ac: any): Handler;

    protected resetFuncs() {
        this.handlers = null;
    }

}
