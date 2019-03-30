import { Type } from '../types';
import { isFunction } from '../utils';
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
            this.actions.splice(this.actions.indexOf(after), 0, action);
        }
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
        return this;
    }

    execute(ctx: T, next?: () => void): void {
        let scope = ctx.currScope;
        ctx.currScope = this;
        this.execActions(ctx, [...this.befores, ...this.actions, ...this.afters], next);
        ctx.currScope = scope;
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
