import { Token, Registration } from '@ts-ioc/core';
import { ModuleConfiguration } from './ModuleConfiguration';


/**
 * inject module builder.
 *
 * @export
 * @class InjectModuleBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectModuleBuilder<T extends IModuleBuilder<any>> extends Registration<T> {
    constructor(desc: string) {
        super('_IOC_ModuleBuilder', desc);
    }
}

/**
 * module builder token.
 */
export const ModuleBuilderToken = new InjectModuleBuilder<IModuleBuilder<any>>('');


/**
 * module builder
 *
 * @export
 * @interface IModuleBuilder
 * @template T
 */
export interface IModuleBuilder<T> {

    /**
     * build module instacne.
     *
     * @param {(Token<T> | ModuleConfiguration<T>)} token build module.
     * @param {any} [data] create instance init data.
     * @returns {Promise<any>}
     * @memberof IPlatform
     */
    build(token: Token<T> | ModuleConfiguration<T>, data?: any): Promise<T>;

    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfiguration<T>} config
     * @returns {Promise<T>}
     * @memberof IModuleBuilder
     */
    buildStrategy(instance: T, config: ModuleConfiguration<T>): Promise<T>;

    /**
     * create instance via token and config.
     *
     * @param {Token<T>} token
     * @param {ModuleConfiguration<T>} config
     * @param {any} [data] create instance init data.
     * @returns {Promise<T>}
     * @memberof IModuleBuilder
     */
    createInstance(token: Token<T>, config: ModuleConfiguration<T>, data?: any): Promise<T>;

    /**
     * get builder.
     *
     * @param {ModuleConfiguration<T>} cfg
     * @returns {IModuleBuilder<T>}
     * @memberof IModuleBuilder
     */
    getBuilder(cfg: ModuleConfiguration<T>): IModuleBuilder<T>;


    /**
     * get the module define decorator or decorator name.
     *
     * @returns {(Function | string)}
     * @memberof IModuleBuilder
     */
    getDecorator(): Function | string;

    /**
     * get configure from module calss metadata or module config object.
     *
     * @param {(Token<any> | ModuleConfiguration<T>)} token
     * @returns {ModuleConfiguration<T>}
     * @memberof IModuleBuilder
     */
    getConfigure(token: Token<any> | ModuleConfiguration<T>): ModuleConfiguration<T>;

}

