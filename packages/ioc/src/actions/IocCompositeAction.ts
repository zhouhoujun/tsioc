import { lang, isBoolean, isClass } from '../utils/lang';
import { ActionType, IActionInjector } from './Action';
import { IocRaiseContext, IocAction } from './IocAction';


/**
 * composite action.
 *
 * @export
 * @class IocCompositeAction
 * @extends {IocAction<T>}
 * @template T
 */
export class IocCompositeAction<T extends IocRaiseContext = IocRaiseContext> extends IocAction<T> {

    protected actions: ActionType[];
    protected befores: ActionType[];
    protected afters: ActionType[];
    private actionFuncs: lang.Action[];

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
     * @memberof IocCompositeAction
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
     * @memberof IocCompositeAction
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
     * @memberof IocCompositeAction
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
     * @memberof IocCompositeAction
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
        if (!this.actionFuncs) {
            this.actionFuncs = [...this.befores, ...this.actions, ...this.afters].map(ac => this.actInjector.getAction<lang.Action<T>>(ac)).filter(f => f);
        }
        this.execFuncs(ctx, this.actionFuncs, next);
    }

    protected regAction(ac: any) {
        if (isClass(ac)) {
            this.actInjector.regAction(ac);
        }
    }

    protected resetFuncs() {
        this.actionFuncs = null;
    }

}
