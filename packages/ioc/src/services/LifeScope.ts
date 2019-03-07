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

    actions: IocActionType[];
    constructor() {
        super();
        this.actions = [];
    }

    use(action: IocActionType): this {
        this.actions.push(action);
        return this;
    }

    useBefore(action: IocActionType, before: IocActionType): this {
        this.actions.splice(this.actions.indexOf(before) - 1, 0, action);
        return this;
    }

    useAfter(action: IocActionType, after: IocActionType): this {
        this.actions.splice(this.actions.indexOf(after), 0, action);
        return this;
    }

    abstract registerDefault(container: IIocContainer);

    execute(container: IIocContainer, ctx: TCtx, next?: () => void) {
        this.execActions(container, ctx, this.actions, next);
    }

    protected execActions(container: IIocContainer, ctx: TCtx, actions: IocActionType[], next?: () => void) {
        lang.execAction(actions.map(ac => {
            if (isClass(ac)) {
                return (ctx: TCtx, next?: () => void) => container.resolve(ac).execute(ctx, next);
            } else if (ac instanceof IocAction) {
                return (ctx: TCtx, next?: () => void) => ac.execute(ctx, next);
            }
            return ac
        }), ctx, next);
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
}
