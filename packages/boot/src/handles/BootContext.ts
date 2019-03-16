import { IContainer } from '@ts-ioc/core';
import { Token, IResolver, ProviderTypes } from '@ts-ioc/ioc';

/**
 * boot context.
 *
 * @export
 * @class BootContext
 */
export class BootContext implements IResolver {

    /**
     * raise container accessor.
     *
     * @memberof ResovleContext
     */
    getRaiseContainer: () => IContainer;


    /**
     * token.
     *
     * @type {Token<any>}
     * @memberof ResovleContext
     */
    token: Token<any>;



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
