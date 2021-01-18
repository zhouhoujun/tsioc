import { Token, ResolveContext, ClassType, IProvider } from '@tsdi/ioc';


/**
 * service resolve context.
 *
 * @export
 * @class ResolveContext
 * @extends {ResovleActionContext}
 */
export interface ServiceContext extends ResolveContext {
    /**
     * service tokens.
     *
     * @type {Type}
     * @memberof ResolveServiceContext
     */
    tokens?: Token[];

    alias?: string;

    /**
     * get extend servie or not.
     *
     * @type {boolean}
     */
    extend?: boolean;

    targetRefs?: any[];

    /**
     * current token.
     */
    currTK?: Token;
}

/**
 * resolve services context.
 */
export interface ServicesContext extends ServiceContext {

    /**
     * types.
     */
    types?: ClassType[];

    /**
     * types matchs.
     */
    matchs?: ((tag: ClassType) => boolean)[];

    /**
     * all matched services map.
     *
     * @type {Injector}
     */
    services?: IProvider;

}
