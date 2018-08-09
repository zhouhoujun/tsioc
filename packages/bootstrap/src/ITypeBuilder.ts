import { Registration, IContainer, Token } from '@ts-ioc/core';
import { TypeConfigure } from './TypeConfigure';

/**
 * inject token Bootstrap builder.
 *
 * @export
 * @class InjectBootstrapBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectTypeBuilder<T extends ITypeBuilder<any>> extends Registration<T> {
    constructor(desc: string) {
        super('DI_TypeBuilder', desc);
    }
}

/**
 * token bootstrap builder token.
 */
export const TypeBuilderToken = new InjectTypeBuilder<IAnyTypeBuilder>('');

/**
 * token bootstrap builder.
 *
 * @export
 * @interface IBootBuilder
 */
export interface ITypeBuilder<T> {

    /**
     * container.
     *
     * @type {IContainer}
     * @memberof IBootstrapBuilder
     */
    container: IContainer;

    /**
     * build token type via config.
     *
     * @param {Token<T>} token
     * @param {TypeConfigure<T>} [config]
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof ITypeBuilder
     */
    build(token: Token<T>, config?: TypeConfigure<T>, data?: any): Promise<T>;

    /**
     * build instance via type config.
     *
     * @param {(Token<T> | TypeConfigure<T>)} config
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IBootBuilder
     */
    buildByConfig(config: Token<T> | TypeConfigure<T>, data?: any): Promise<T>;

    /**
     * get finally builder by token and config.
     *
     * @param {TypeConfigure<T>} [config]
     * @returns {ITypeBuilder<T>}
     * @memberof IBootBuilder
     */
    getBuilder(config?: TypeConfigure<T>): ITypeBuilder<T>;

    /**
     * get bootstrap token.
     *
     * @param {TypeConfigure<T>} config
     * @returns {Token<T>}
     * @memberof IBootstrapBuilder
     */
    getBootstrapToken(config: TypeConfigure<T>): Token<T>;

    /**
     * create token instance.
     *
     * @param {Token<T>} token
     * @param {TypeConfigure<T>} config
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IBootstrapBuilder
     */
    createInstance(token: Token<T>, config: TypeConfigure<T>, data?: any): Promise<T>;

    /**
     * bundle bootstrap instance via config.
     *
     * @param {T} instance
     * @param {TypeConfigure<T>} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof IBootstrapBuilder
     */
    buildStrategy(instance: T, config: TypeConfigure<T>): Promise<T>;
}

/**
 * any class bootstrap builder
 *
 * @export
 * @interface AnyBootstrapBuilder
 * @extends {ITypeBuilder<any>}
 */
export interface IAnyTypeBuilder extends ITypeBuilder<any> {
    /**
     * bootstrap ioc module.
     *
     * @template T
     * @param {Token<T>} token
     * @param {TypeConfigure<T>} config
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof AnyBootstrapBuilder
     */
    build<T>(token: Token<T>, config: TypeConfigure<T>, data?: any): Promise<T>;
}
