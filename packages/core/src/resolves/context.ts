import { Token, ResolveContext, ResolveOption, ClassType, IProvider } from '@tsdi/ioc';

/**
 * service context option.
 *
 * @export
 * @interface ServiceOption
 * @extends {ResovleActionOption}
 */
export interface ServiceOption<T> extends ResolveOption<T> {
    /**
     * token provider service type.
     *
     * @type {Type}
     */
    tokens?: Token<T>[];

    /**
     * token alias.
     *
     * @type {string}
     */
    alias?: string;
    /**
     * get extend servie or not.
     *
     * @type {boolean}
     */
    extend?: boolean;
}

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

    targetRefs: any[];

    /**
     * current token.
     */
    currTK?: Token;
}


/**
 * services context options
 *
 * @export
 * @interface ServicesOption
 * @extends {ServiceOption}
 */
export interface ServicesOption<T> extends ServiceOption<T> {
    /**
     * get services both in container and target private refrence service.
     *
     * @type {boolean}
     */
    both?: boolean;
}

/**
 * resolve services context.
 */
export interface ServicesContext extends ServiceContext {

    /**
     * types.
     */
    types: ClassType[];

    /**
     * all matched services map.
     *
     * @type {Injector}
     */
    services?: IProvider;

}
