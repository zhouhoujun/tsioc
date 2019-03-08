import { IocCoreService } from './IocCoreService';
import { IocAction, IocActionType } from '../actions';
import { Type } from '../types';
import { isClass, isArray, lang } from '../utils';
import { IIocContainer } from '../IIocContainer';
import { getOwnParamerterNames } from '../factories';

/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCoreService}
 */
export abstract class LifeScope<TCtx> extends IocCoreService {

    protected actions: IocActionType[];
    constructor() {
        super();
        this.actions = [];
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
        if (first) {
            this.actions.unshift(action);
        } else {
            this.actions.push(action);
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
        this.actions.splice(this.actions.indexOf(before) - 1, 0, action);
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
        this.actions.splice(this.actions.indexOf(after), 0, action);
        return this;
    }

    /**
     * resgister default action.
     *
     * @abstract
     * @param {IIocContainer} container
     * @memberof LifeScope
     */
    abstract registerDefault(container: IIocContainer);

    /**
     * execut actions.
     *
     * @param {IIocContainer} container
     * @param {TCtx} ctx
     * @param {() => void} [next] execute after all.
     * @memberof LifeScope
     */
    execute(container: IIocContainer, ctx: TCtx, next?: () => void) {
        this.execActions(container, ctx, this.actions, next);
    }

    /**
     * get paramerter names.
     *
     * @template T
     * @param {Type<T>} type
     * @param {string} propertyKey
     * @returns {string[]}
     * @memberof LifeScope
     */
    getParamerterNames<T>(type: Type<T>, propertyKey: string): string[] {
        let metadata = getOwnParamerterNames(type);
        let paramNames = [];
        if (metadata && metadata.hasOwnProperty(propertyKey)) {
            paramNames = metadata[propertyKey]
        }
        if (!isArray(paramNames)) {
            paramNames = [];
        }
        return paramNames;
    }

    protected execActions(container: IIocContainer, ctx: TCtx, actions: IocActionType[], next?: () => void) {
        lang.execAction(actions.map(ac => this.toActionFunc(ac, container)), ctx, next);
    }

    protected toActionFunc(ac: IocActionType, container: IIocContainer) {
        if (isClass(ac)) {
            return (ctx: TCtx, next?: () => void) => {
                let action = this.resolveAction(container, ctx, ac);
                if (action instanceof IocAction) {
                    action.execute(ctx, next);
                } else {
                    next();
                }
            }
        } else if (ac instanceof IocAction) {
            return (ctx: TCtx, next?: () => void) => ac.execute(ctx, next);
        }
        return ac
    }

    protected resolveAction(container: IIocContainer, ctx: TCtx, ac: Type<IocAction<any>>) {
        return container.resolve(ac);
    }

}
