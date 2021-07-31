import { Token, ClassType, IocContext, ProviderType, FacRecord } from '@tsdi/ioc';


/**
 * resovle action option.
 */
 export interface ResolveContext extends IocContext {

    token?: Token;
    /**
     * resolve token in target context.
     */
    target?: Token | Object | (Token | Object)[];

    targetRefs?: ClassType[];
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

    /**
     * service tokens.
     *
     * @type {Type}
     * @memberof ResolveServiceContext
     */
     tokens?: Token[];
     /**
      * get extend servie or not.
      *
      * @type {boolean}
      */
     extend?: boolean;
 
     /**
      * current token.
      */
     currTK?: Token;

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
     * reslove result instance.
     *
     * @type {*}
     * @memberof IResolveContext
     */
     instance?: any;

}

/**
 * resolve services context.
 */
export interface ServicesContext extends ResolveContext {

    /**
     * types.
     */
    types?: ClassType[];

    /**
     * types matchs.
     */
    match?: (tag: ClassType, base: ClassType) => boolean;

    /**
     * all matched services map.
     *
     * @type {Injector}
     */
    services?: Map<ClassType, FacRecord>;

}
