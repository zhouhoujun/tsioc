import { Type } from '../types';
import { lang, isClass } from '../utils';
import { IocAction, IocActionType, IocActionContext } from './Action';
import { IocRegisterAction } from './IocRegisterAction';


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
        this.checkRegister(action);
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
        this.checkRegister(action);
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
        this.checkRegister(action);
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
        this.checkRegister(action);
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
        this.checkRegister(action);
        return this;
    }

    execute(ctx: T, next?: () => void): void {
        let scope = ctx.currScope;
        ctx.currScope = this;
        this.execActions(ctx, [...this.befores, ...this.actions, ...this.afters], next);
        ctx.currScope = scope;
    }

    protected execActions(ctx: T, actions: IocActionType[], next?: () => void) {
        lang.execAction(actions.map(ac => this.toActionFunc(ac)), ctx, next);
    }

    protected toActionFunc(ac: IocActionType) {
        if (isClass(ac)) {
            return (ctx: T, next?: () => void) => {
                let action = this.resolveAction(ac);
                if (action instanceof IocAction) {
                    action.execute(ctx, next);
                } else {
                    next();
                }
            }
        } else if (ac instanceof IocAction) {
            return (ctx: T, next?: () => void) => ac.execute(ctx, next);
        }
        return ac
    }

    protected checkRegister(action: IocActionType) {
        if (isClass(action) && !this.container.has(action)) {
            this.registerAction(action);
        }
    }

    protected registerAction(action: Type<any>) {
        if (lang.isExtendsClass(action, IocRegisterAction)) {
            this.container.registerSingleton(action, () => new action(this.container));
        } else {
            this.container.register(action);
        }
    }


    protected resolveAction(ac: Type<IocAction<T>>): IocAction<T> {
        return this.container.resolve(ac);
    }
}
