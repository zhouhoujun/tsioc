import { Type } from '../types';
import { isFunction, lang } from '../utils';
import { IocAction, IocActionType, IocActionContext } from './Action';


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
     * @param {boolean} [first]  use action at first or last.
     * @returns {this}
     * @memberof LifeScope
     */
    use(action: IocActionType, first?: boolean): this {
        if (!this.has(action)) {
            if (first) {
                this.actions.unshift(action);
            } else {
                this.actions.push(action);
            }
        }
        this.resetFuncs();
        return this;
    }

    /**
     * use action before
     *
     * @param {IocActionType} action
     * @param {IocActionType} before
     * @returns {this}
     * @memberof LifeScope
     */
    useBefore(action: IocActionType, before: IocActionType): this {
        if (!this.has(action)) {
            this.actions.splice(this.actions.indexOf(before) - 1, 0, action);
        }
        this.resetFuncs();
        return this;
    }
    /**
     * use action after.
     *
     * @param {IocActionType} action
     * @param {IocActionType} after
     * @returns {this}
     * @memberof LifeScope
     */
    useAfter(action: IocActionType, after: IocActionType): this {
        if (!this.has(action)) {
            this.actions.splice(this.actions.indexOf(after) + 1, 0, action);
        }
        this.resetFuncs();
        return this;
    }

    /**
     * register actions before run this scope.
     *
     * @param {IocActionType} action
     * @memberof IocCompositeAction
     */
    before(action: IocActionType): this {
        if (this.befores.indexOf(action) < 0) {
            this.befores.push(action);
        }
        this.resetFuncs();
        return this;
    }

    /**
     * register actions after run this scope.
     *
     * @param {IocActionType} action
     * @memberof IocCompositeAction
     */
    after(action: IocActionType): this {
        if (this.afters.indexOf(action) < 0) {
            this.afters.push(action);
        }
        this.resetFuncs();
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

    protected setScope(ctx: T, parentScope?: any) {
        ctx.currScope = parentScope || this;
    }

    protected resetFuncs() {
        this.actionFuncs = null;
    }

    protected registerAction(action: Type<any>, setup?: boolean) {
        this.container.registerSingleton(action, () => new action(this.container));
        if (setup) {
            let instance = this.container.get(action);
            if (instance && isFunction(instance.setup)) {
                instance.setup();
            } else {
                console.log(action, 'action has not setup.');
            }
        }
        return this;
    }

}
