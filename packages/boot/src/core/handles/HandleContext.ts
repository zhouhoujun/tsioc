import { IContainer } from '@ts-ioc/core';
import { Token, IResolver, ProviderTypes, Type } from '@ts-ioc/ioc';

/**
 * handle context.
 *
 * @export
 * @class HandleContext
 */
export class HandleContext implements IResolver {

    /**
     * raise container accessor.
     *
     * @memberof ResovleContext
     */
    getRaiseContainer: () => IContainer;

    /**
     * module type class.
     *
     * @type {Type<any>}
     * @memberof HandleContext
     */
    type: Type<any>;

    /**
     * token.
     *
     * @type {Token<any>}
     * @memberof ResovleContext
     */
    token?: Token<any>;



    constructor() {

    }

    /**
     * set resolve context.
     *
     * @param {() => IContainer} raiseContainerGetter
     * @memberof IocActionContext
     */
    setContext(raiseContainerGetter: () => IContainer) {
        this.getRaiseContainer = raiseContainerGetter;
    }


    has<T>(key: Token<T>, alias?: string): boolean {
        return this.getRaiseContainer().has(key, alias);
    }
    resolve<T>(token: Token<T>, ...providers: ProviderTypes[]): T {
        return this.getRaiseContainer().resolve(token, ...providers);
    }
    unregister<T>(token: Token<T>): this {
        this.getRaiseContainer().unregister(token);
        return this;
    }
}
