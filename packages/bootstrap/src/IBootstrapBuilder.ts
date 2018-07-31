import { IocModule } from './ModuleType';
import { ModuleConfiguration } from './ModuleConfiguration';
import { InjectToken, Registration, Token } from '@ts-ioc/core';

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
     * bootstrap ioc module.
     *
     * @param {IocModule<T>} iocModule
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IModuleBootstrap
     */
    build(iocModule: IocModule<T>, data?: any): Promise<T>;

    /**
     * get bootstrap builder
     *
     * @param {IocModule<T>} iocModule
     * @returns {IBootstrapBuilder}
     * @memberof IBootstrapBuilder
     */
    getBuilder(iocModule: IocModule<T>): IBootstrapBuilder<T>;

    /**
     * get bootstrap token.
     *
     * @param {IocModule<T>} iocModule
     * @returns {Token<T>}
     * @memberof IBootstrapBuilder
     */
    getBootstrapToken(iocModule: IocModule<T>): Token<T>;

    /**
     * bundle bootstrap instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfiguration<T>} config
     * @returns {Promise<T>}
     * @memberof IModuleBootstrap
     */
    buildStrategy(instance: T, config: ModuleConfiguration<T>): Promise<T>;
}
