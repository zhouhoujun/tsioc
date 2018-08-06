import { Registration, IContainer, Token } from '@ts-ioc/core';
import { ModuleConfigure } from './ModuleConfigure';

/**
 * inject token Bootstrap builder.
 *
 * @export
 * @class InjectBootstrapBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectBootBuilder<T extends IBootBuilder<any>> extends Registration<T> {
    constructor(desc: string) {
        super('DI_ModuleBootstrap', desc);
    }
}

/**
 * token bootstrap builder token.
 */
export const BootBuilderToken = new InjectBootBuilder<AnyBootstrapBuilder>('');

/**
 * token bootstrap builder.
 *
 * @export
 * @interface IBootBuilder
 */
export interface IBootBuilder<T> {

    /**
     * container.
     *
     * @type {IContainer}
     * @memberof IBootstrapBuilder
     */
    container: IContainer;

    /**
     * bootstrap ioc module.
     *
     * @param {(Token<T>|ModuleConfigure)} token
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IBootstrapBuilder
     */
    build(token: Token<T>, config: ModuleConfigure, data?: any): Promise<T>;

    /**
     * build
     *
     * @param {(Token<T> | ModuleConfigure))} config
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IBootBuilder
     */
    buildByConfig(config: Token<T> | ModuleConfigure, data?: any): Promise<T>;

    /**
     * get finally builder by token and config.
     *
     * @param {Token<T>} token
     * @param {ModuleConfigure} [config]
     * @returns {IBootBuilder<T>}
     * @memberof IBootBuilder
     */
    getBuilder(token: Token<T>, config?: ModuleConfigure): IBootBuilder<T>;

    /**
     * get bootstrap token.
     *
     * @param {ModuleConfigure} config
     * @returns {Token<T>}
     * @memberof IBootstrapBuilder
     */
    getBootstrapToken(config: ModuleConfigure): Token<T>;

    /**
     * create token instance.
     *
     * @param {Token<T>} token
     * @param {ModuleConfigure} config
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IBootstrapBuilder
     */
    createInstance(token: Token<T>, config: ModuleConfigure, data?: any): Promise<T>;

    /**
     * bundle bootstrap instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfigure} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof IBootstrapBuilder
     */
    buildStrategy(instance: T, config: ModuleConfigure): Promise<T>;
}

/**
 * any class bootstrap builder
 *
 * @export
 * @interface AnyBootstrapBuilder
 * @extends {IBootBuilder<any>}
 */
export interface AnyBootstrapBuilder extends IBootBuilder<any> {
    /**
     * bootstrap ioc module.
     *
     * @template T
     * @param {Token<T>} token
     * @param {ModuleConfigure} config
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof AnyBootstrapBuilder
     */
    build<T>(token: Token<T>, config: ModuleConfigure, data?: any): Promise<T>;
}
