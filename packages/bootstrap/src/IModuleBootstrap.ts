import { IocModule } from './ModuleType';
import { ModuleConfiguration } from './ModuleConfiguration';
import { InjectToken, Registration } from '@ts-ioc/core';

/**
 * inject module builder.
 *
 * @export
 * @class InjectModuleBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectModuleBootstrap<T extends IModuleBootstrap> extends Registration<T> {
    constructor(desc: string) {
        super('DI_ModuleBootstrap', desc);
    }
}

export const ModuleBootstrapToken = new InjectModuleBootstrap('');

/**
 * module bootstrap.
 *
 * @export
 * @interface IModuleBootstrap
 * @template T
 */
export interface IModuleBootstrap {

    /**
     * bootstrap ioc module.
     *
     * @param {IocModule<any>} iocModule
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof IModuleBootstrap
     */
    bootstrap(iocModule: IocModule<any>, data?: any): Promise<any>;
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
