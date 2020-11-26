import { Token } from './tokens';
import { isBoolean } from './utils/chk';
import { chain, Handler } from './utils/hdl';

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

    protected handles: ActionType[];
    protected befores: ActionType[];
    protected afters: ActionType[];
    private funcs: Handler[];

    constructor() {
        super();
        this.befores = [];
        this.handles = [];
        this.afters = [];
    }

    has(action: ActionType) {
        return this.handles.indexOf(action) >= 0;
    }

    /**
     * use action.
     *
     * @param {ActionType} action
     * @param {boolean} [setup]  register action type or not.
     * @returns {this}
     */
    use(...actions: ActionType[]): this {
        const len = this.handles.length;
        actions.forEach(action => {
            if (this.has(action)) return;
            this.handles.push(action);
            this.regHandle(action);
        });
        if (this.handles.length !== len) this.resetFuncs();
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
            this.handles.splice(this.handles.indexOf(before), 0, action);
        } else {
            this.handles.unshift(action);
        }
        this.regHandle(action);
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
            this.handles.splice(this.handles.indexOf(after) + 1, 0, action);
        } else {
            this.handles.push(action);
        }
        this.regHandle(action);
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
            this.regHandle(action);
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
            this.regHandle(action);
            this.resetFuncs();
        }
        return this;
    }

    execute(ctx: T, next?: () => void): void {
        if (!this.funcs) {
            this.funcs = [...this.befores, ...this.handles, ...this.afters].map(ac => this.toHandle(ac)).filter(f => f);
        }
        this.execFuncs(ctx, this.funcs, next);
    }

    protected abstract regHandle(ac: any);

    protected abstract toHandle(ac: any): Handler;

    protected resetFuncs() {
        this.funcs = null;
    }

}
