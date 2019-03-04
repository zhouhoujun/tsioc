import 'reflect-metadata';
import { IContainer } from './IContainer';
import { IContainerBuilder, ContainerBuilderToken } from './IContainerBuilder';
import { ParamProviders, IocContainer, Type, Token, Modules, LoadType, ClassType } from '@ts-ioc/ioc';
import { ServiceResolver, ServicesResolver, RefServiceResolver } from './services';
import { RefTarget, ReferenceToken, RefTokenFac } from './types';
import { registerCores } from './registerCores';


/**
 * Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container extends IocContainer implements IContainer {

    constructor() {
        super();
    }

    get size(): number {
        return this.factories.size;
    }

    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof Container
     */
    getBuilder(): IContainerBuilder {
        return this.resolve(ContainerBuilderToken);
    }


    /**
     * get token implements class type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {boolean} [inchain]
     * @returns {Type<T>}
     * @memberof Container
     */
    getTokenImpl<T>(token: Token<T>): Type<T> {
        return this.getTokenProvider(token);
    }

    /**
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof Container
     */
    use(...modules: Modules[]): this {
        this.getBuilder().syncLoadModule(this, ...modules);
        return this;
    }

    /**
     * async use modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type<any>[]>}  types loaded.
     * @memberof IContainer
     */
    loadModule(...modules: LoadType[]): Promise<Type<any>[]> {
        return this.getBuilder().loadModule(this, ...modules);
    }


    /**
     * get service or target reference service.
     *
     * @template T
     * @param {(Token<T> | Token<any>[])} token servive token.
     * @param {(RefTarget | RefTarget[])} [target] service refrence target.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof Container
     */
    getService<T>(token: Token<T> | Token<any>[], target?: RefTarget | RefTarget[] | ParamProviders, toRefToken?: boolean | Token<T> | RefTokenFac<T> | ParamProviders, defaultToken?: boolean | Token<T> | ParamProviders, ...providers: ParamProviders[]): T {
        return this.resolve(ServiceResolver).getService(token, target, toRefToken, defaultToken, ...providers);
    }

    /**
     * get all service extends type and reference target.
     *
     * @template T
     * @param {(Token<T> | ((token: ClassType<T>) => boolean))} type servive token or express match token.
     * @param {(Token<any> | Token<any>[])} [target] service refrence target.
     * @param {(boolean|ParamProviders)} [both]
     * @param {(boolean|ParamProviders)} [both] get services bubble up to parent container.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getServices<T>(token: Token<T> | ((token: ClassType<T>) => boolean), target?: Token<any> | Token<any>[] | ParamProviders, both?: boolean | ParamProviders, ...providers: ParamProviders[]): T[] {
        return this.resolve(ServicesResolver).getServices(token, target, both, ...providers);
    }

    /**
     * get target reference service.
     *
     * @template T
     * @param {Type<Registration<T>>} [refToken] reference service Registration Injector
     * @param {RefTarget | RefTarget[]} target  the service reference to.
     * @param {Token<T>} [defaultToken] default service token.
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof Container
     */
    getRefService<T>(refToken: ReferenceToken<T>, target: RefTarget | RefTarget[], defaultToken?: Token<T> | Token<any>[], ...providers: ParamProviders[]): T {
        return this.resolve(RefServiceResolver).getRefService(refToken, target, defaultToken, ...providers);
    }


    protected init() {
        super.init();
        registerCores(this);
    }
}
