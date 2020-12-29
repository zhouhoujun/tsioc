import { Token } from '../tokens';
import { IocAction } from '../action';
import { IocContext } from './ctx';



/**
 * resovle action option.
 *
 */
export interface ResolveContext extends IocContext {
    /**
     * reslove result instance.
     *
     * @type {*}
     * @memberof IResolveContext
     */
    instance?: any;

    token?: Token;
    /**
     * resolve token in target context.
     */
    target?: Token | Object | (Token | Object)[];

    targetToken?: Token;
    /**
     * only for target private or ref token. if has target.
     */
    tagOnly?: boolean;
    /**
     * all faild use the default token to get instance.
     */
    defaultToken?: Token;
    /**
     * register token if has not register.
     *
     */
    regify?: boolean;

}

/**
 * ioc Resolve action.
 *
 * the Resolve type class can only Resolve in ioc as:
 * ` container.ResolveSingleton(SubResolveAction, () => new SubResolveAction(container));`
 * @export
 * @abstract
 * @class IocResolveAction
 * @extends {IocAction<T>}
 * @template T
 */
export abstract class IocResolveAction<T extends ResolveContext = ResolveContext> extends IocAction<T> { }
