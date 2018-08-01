import { Registration, IContainer, Token } from '@ts-ioc/core';
import { ModuleConfiguration } from './ModuleConfiguration';

/**
 * inject Bootstrap builder.
 *
 * @export
 * @class InjectBootstrapBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectBootstrapBuilder<T> extends Registration<IBootstrapBuilder<T>> {
    constructor(desc: string) {
        super('DI_ModuleBootstrap', desc);
    }
}

/**
 * bootstrap builder token.
 */
export const BootstrapBuilderToken = new InjectBootstrapBuilder<any>('');

/**
 * module bootstrap.
 *
 * @export
 * @interface IModuleBootstrap
 */
export interface IBootstrapBuilder<T> {

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
     * @param {(Token<T>|ModuleConfiguration<T>)} token
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IBootstrapBuilder
     */
    build(token: Token<T> | ModuleConfiguration<T>, data?: any): Promise<T>;

    /**
     * get bootstrap token.
     *
     * @param {ModuleConfiguration<T>} config
     * @returns {Token<T>}
     * @memberof IBootstrapBuilder
     */
    getBootstrapToken(config: ModuleConfiguration<T>): Token<T>;

    /**
     * create token instance.
     *
     * @param {Token<T>} token
     * @param {ModuleConfiguration<T>} config
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IBootstrapBuilder
     */
    createInstance(token: Token<T>, config: ModuleConfiguration<T>, data?: any): Promise<T>;

    /**
     * bundle bootstrap instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfiguration<T>} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof IBootstrapBuilder
     */
    buildStrategy(instance: T, config: ModuleConfiguration<T>): Promise<T>;
}
