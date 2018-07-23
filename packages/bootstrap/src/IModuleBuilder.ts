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
     * get configure from module calss metadata or module config object.
     *
     * @param {(Token<any> | ModuleConfiguration<T>)} token
     * @param {(Function|string)} [moduleDecorator] default DefModule.
     * @returns {ModuleConfiguration<T>}
     * @memberof IModuleBuilder
     */
    getConfigure(token: Token<any> | ModuleConfiguration<T>, moduleDecorator?: Function | string): ModuleConfiguration<T>;

    /**
     * build module instacne.
     *
     * @param {(Token<T> | ModuleConfiguration<T>)} token build module.
     * @param {(Function|string)} [moduleDecorator] default DefModule.
     * @returns {Promise<any>}
     * @memberof IPlatform
     */
    build(token: Token<T> | ModuleConfiguration<T>, moduleDecorator?: Function | string): Promise<T>;

}

