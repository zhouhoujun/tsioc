import { Type } from '../types';
import { Handler, chain, isBoolean, isClass } from '../utils/lang';
import { Token, tokenId, TokenId } from '../tokens';
import { IInjector, IProvider } from '../IInjector';
import { ITypeReflects } from '../services/ITypeReflects';

/**
 * action injector.
 */
export interface IActionInjector extends IInjector {
    /**
     * register action, simple create instance via `new type(this)`.
     * @param type
     */
    regAction<T extends Action>(type: Type<T>): this;
    /**
     * get action via target.
     * @param target target.
     */
    getAction<T extends Function>(target: Token<Action> | Action | Function): T;
}

export const ActionInjectorToken: TokenId<IActionInjector> = tokenId<IActionInjector>('ACTION_INJECTOR');

/**
 * action interface.
 */
export abstract class Action {
    constructor() {
    }

    abstract toAction(): Function;
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
 * context interface.
 */
export interface IocContext {
    /**
     * current injector.
     */
    injector: IInjector;
    /**
     * reflects.
     */
    reflects?: ITypeReflects;

    /**
     *  providers.
     */
    providers?: IProvider;
}


/**
 * action.
 *
 * @export
 * @abstract
 * @class Action
 * @extends {IocCoreService}
 */
export abstract class IocAction<T extends IocContext> extends Action {

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
 * actions.
 *
 * @export
 * @class IocActions
 * @extends {IocAction<T>}
 * @template T
 */
export class IocActions<T extends IocContext = IocContext> extends IocAction<T> {

    protected actions: ActionType[];
    protected befores: ActionType[];
    protected afters: ActionType[];
    private handlers: Handler[];

    constructor(protected actInjector: IActionInjector) {
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
     * @memberof LifeScope
     */
    use(action: ActionType): this {
        if (this.has(action)) {
            return this;
        }
        this.actions.push(action);
        this.regAction(action);
        this.resetFuncs();
        return this;
    }

    /**
     * use action before
     *
     * @param {ActionType} action
     * @param {ActionType} [before]
     * @returns {this}
     * @memberof IocActions
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
     * @memberof IocActions
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
     * @memberof IocActions
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
     * @memberof IocActions
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
            this.handlers = [...this.befores, ...this.actions, ...this.afters].map(ac => this.actInjector.getAction<Handler<T>>(ac)).filter(f => f);
        }
        this.execFuncs(ctx, this.handlers, next);
    }

    protected regAction(ac: any) {
        if (isClass(ac)) {
            this.actInjector.regAction(ac);
        }
    }

    protected resetFuncs() {
        this.handlers = null;
    }

}

/**
 * composite actions.
 * @deprecated
 * use IocActions instead.
 */
export abstract class IocCompositeAction<T extends IocContext = IocContext> extends IocActions<T> {}


