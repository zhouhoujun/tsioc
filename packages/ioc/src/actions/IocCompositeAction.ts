import { lang, isBoolean, isClass } from '../utils/lang';
import { IocAction, IocActionType, IocRaiseContext, IActionInjector } from './Action';
import { ActionRegisterer } from './ActionRegisterer';


/**
 * composite action.
 *
 * @export
 * @class IocCompositeAction
 * @extends {IocAction<T>}
 * @template T
 */
export class IocCompositeAction<T extends IocRaiseContext = IocRaiseContext> extends IocAction<T> {

    protected actions: IocActionType[];
    protected befores: IocActionType[];
    protected afters: IocActionType[];
    private actionFuncs: lang.Action[];

    constructor(protected actInjector: IActionInjector) {
        super();
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
    use(action: IocActionType): this {
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
     * @param {IocActionType} action
     * @param {IocActionType} [before]
     * @returns {this}
     * @memberof IocCompositeAction
     */
    useBefore(action: IocActionType, before?: IocActionType): this {
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
     * @param {IocActionType} action
     * @param {IocActionType} [after]
     * @returns {this}
     * @memberof IocCompositeAction
     */
    useAfter(action: IocActionType, after?: IocActionType): this {
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
     * @param {IocActionType} action
     * @memberof IocCompositeAction
     */
    before(action: IocActionType): this {
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
     * @param {IocActionType} action
     * @memberof IocCompositeAction
     */
    after(action: IocActionType): this {
        if (this.afters.indexOf(action) < 0) {
            this.afters.push(action);
            this.regAction(action);
            this.resetFuncs();
        }
        return this;
    }

    execute(ctx: T, next?: () => void): void {
        if (!this.actionFuncs) {
            let register = ctx.getContainer().getInstance(ActionRegisterer);
            this.actionFuncs = [...this.befores, ...this.actions, ...this.afters].map(ac => register.getAction<lang.Action<T>>(ac)).filter(f => f);
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
