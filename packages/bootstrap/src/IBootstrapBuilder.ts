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
export class InjectBootstrapBuilder<T extends IBootstrapBuilder> extends Registration<T> {
    constructor(desc: string) {
        super('DI_ModuleBootstrap', desc);
    }
}

/**
 * bootstrap builder token.
 */
export const BootstrapBuilderToken = new InjectBootstrapBuilder('');

/**
 * module bootstrap.
 *
 * @export
 * @interface IModuleBootstrap
 */
export interface IBootstrapBuilder {

    /**
     * bootstrap ioc module.
     *
     * @param {IocModule<T>} iocModule
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof IModuleBootstrap
     */
    build<T>(iocModule: IocModule<T>, data?: any): Promise<T>;

    /**
     * get bootstrap builder
     *
     * @param {IocModule<any>} iocModule
     * @returns {IBootstrapBuilder}
     * @memberof IBootstrapBuilder
     */
    getBuilder(iocModule: IocModule<any>): IBootstrapBuilder;

    /**
     * get bootstrap token.
     *
     * @param {IocModule<any>} iocModule
     * @returns {Token<any>}
     * @memberof IBootstrapBuilder
     */
    getBootstrapToken(iocModule: IocModule<any>): Token<any>;

    /**
     * bundle bootstrap instance via config.
     *
     * @param {any} instance
     * @param {ModuleConfiguration<any>} config
     * @returns {Promise<any>}
     * @memberof IModuleBootstrap
     */
    buildStrategy(instance: any, config: ModuleConfiguration<any>): Promise<any>;
}
