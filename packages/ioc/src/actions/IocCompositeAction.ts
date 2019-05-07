import { lang, isClass, isBoolean } from '../utils';
import { IocAction, IocActionType, IocActionContext } from './Action';
import { IIocContainer } from '../IIocContainer';

/**
 * action registerer.
 *
 * @export
 * @class ActionRegisterer
 */
export class ActionRegisterer {
    constructor() {

    }

    register(container: IIocContainer, action: IocActionType, setup?: boolean): this {
        if (!isClass(action)) {
            return this;
        }
        if (container.has(action)) {
            return this;
        }
        container.registerSingleton(action, () => new action(container));
        if (setup) {
            let instance = container.get(action);
            if (instance instanceof IocCompositeAction) {
                instance.setup();
            }
        }
        return this;
    }
}

/**
 * composite action.
 *
 * @export
 * @class IocCompositeAction
 * @extends {IocAction<T>}
 * @template T
 */
export class IocCompositeAction<T extends IocActionContext> extends IocAction<T> {

    protected actions: IocActionType[];
    protected befores: IocActionType[];
    protected afters: IocActionType[];

    private actionFuncs: lang.IAction<any>[];
    protected initAction() {
        this.befores = [];
        this.actions = [];
        this.afters = [];
    }

    has(action: IocActionType) {
        return this.actions.indexOf(action) >= 0;
    }

    /**
     * use action.
     *
     * @param {IocActionType} action
     * @param {boolean} [setup]  register action type or not.
     * @returns {this}
     * @memberof LifeScope
     */
    use(action: IocActionType, setup?: boolean): this {
        if (this.has(action)) {
            return this;
        }
        this.actions.push(action);
        this.registerAction(action, setup);
        this.resetFuncs();
        return this;
    }

    /**
     * use action before
     *
     * @param {IocActionType} action
     * @param {(IocActionType | boolean)} [before]
     * @param {boolean} [setup]
     * @returns {this}
     * @memberof IocCompositeAction
     */
    useBefore(action: IocActionType, before?: IocActionType | boolean, setup?: boolean): this {
        if (this.has(action)) {
            return this;
        }
        if (before) {
            if (isBoolean(before)) {
                this.actions.unshift(action);
                setup = before;
            } else {
                this.actions.splice(this.actions.indexOf(before) - 1, 0, action);
            }
        } else {
            this.actions.unshift(action);
        }
        this.registerAction(action, setup);
        this.resetFuncs();
        return this;
    }

    /**
     * use action after.
     *
     * @param {IocActionType} action
     * @param {(IocActionType | boolean)} after
     * @param {boolean} [setup]
     * @returns {this}
     * @memberof IocCompositeAction
     */
    useAfter(action: IocActionType, after: IocActionType | boolean, setup?: boolean): this {
        if (this.has(action)) {
            return this;
        }
        if (after) {
            if (isBoolean(after)) {
                this.actions.unshift(action);
                setup = after;
            } else {
                this.actions.splice(this.actions.indexOf(after) - 1, 0, action);
            }
        } else {
            this.actions.unshift(action)
        }
        this.registerAction(action, setup);
        this.resetFuncs();
        return this;
    }

    /**
     * register actions before run this scope.
     *
     * @param {IocActionType} action
     * @memberof IocCompositeAction
     */
    before(action: IocActionType, setup?: boolean): this {
        if (this.befores.indexOf(action) < 0) {
            this.befores.push(action);
            this.registerAction(action, setup);
            this.resetFuncs();
        }
        return this;
    }

    /**
     * register actions after run this scope.
     *
     * @param {IocActionType} action
     * @memberof IocCompositeAction
     */
    after(action: IocActionType, setup?: boolean): this {
        if (this.afters.indexOf(action) < 0) {
            this.afters.push(action);
            this.registerAction(action, setup);
            this.resetFuncs();
        }
        return this;
    }

    execute(ctx: T, next?: () => void): void {
        let scope = ctx.currScope;
        this.setScope(ctx);
        if (!this.actionFuncs) {
            this.actionFuncs = [...this.befores, ...this.actions, ...this.afters].map(ac => this.toActionFunc(ac));
        }
        this.execActions(ctx, this.actionFuncs, next);
        this.setScope(ctx, scope);
    }

    protected registerAction(action: IocActionType, setup?: boolean): this {
        this.container.get(ActionRegisterer)
            .register(this.container, action, setup);
        return this;
    }

    protected setScope(ctx: T, parentScope?: any) {
        ctx.currScope = parentScope || this;
    }

    protected resetFuncs() {
        this.actionFuncs = null;
    }



    setup?() {

    }

}
