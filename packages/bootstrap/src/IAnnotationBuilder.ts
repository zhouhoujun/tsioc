import { Registration, IContainer, Token } from '@ts-ioc/core';
import { AnnotationConfigure } from './AnnotationConfigure';

/**
 * inject Annotation class builder.
 *
 * @export
 * @class InjectBootstrapBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectAnnotationBuilder<T extends IAnnotationBuilder<any>> extends Registration<T> {
    constructor(desc: string) {
        super('DI_TypeBuilder', desc);
    }
}

/**
 * Annotation class builder token.
 */
export const AnnotationBuilderToken = new InjectAnnotationBuilder<IAnyTypeBuilder>('');

/**
 * Annotation class builder.
 *
 * @export
 * @interface IBootBuilder
 */
export interface IAnnotationBuilder<T> {

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
     * @param {AnnotationConfigure<T>} [config]
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof ITypeBuilder
     */
    build(token: Token<T>, config?: AnnotationConfigure<T>, data?: any): Promise<T>;

    /**
     * build instance via type config.
     *
     * @param {(Token<T> | AnnotationConfigure<T>)} config
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IBootBuilder
     */
    buildByConfig(config: Token<T> | AnnotationConfigure<T>, data?: any): Promise<T>;

    /**
     * get finally builder by token and config.
     *
     * @param {AnnotationConfigure<T>} [config]
     * @returns {IAnnotationBuilder<T>}
     * @memberof IBootBuilder
     */
    getBuilder(config?: AnnotationConfigure<T>): IAnnotationBuilder<T>;

    /**
     * get bootstrap token.
     *
     * @param {AnnotationConfigure<T>} config
     * @returns {Token<T>}
     * @memberof IBootstrapBuilder
     */
    getBootstrapToken(config: AnnotationConfigure<T>): Token<T>;

    /**
     * create token instance.
     *
     * @param {Token<T>} token
     * @param {AnnotationConfigure<T>} config
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IBootstrapBuilder
     */
    createInstance(token: Token<T>, config: AnnotationConfigure<T>, data?: any): Promise<T>;

    /**
     * bundle bootstrap instance via config.
     *
     * @param {T} instance
     * @param {AnnotationConfigure<T>} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof IBootstrapBuilder
     */
    buildStrategy(instance: T, config: AnnotationConfigure<T>): Promise<T>;
}

/**
 * any class bootstrap builder
 *
 * @export
 * @interface AnyBootstrapBuilder
 * @extends {IAnnotationBuilder<any>}
 */
export interface IAnyTypeBuilder extends IAnnotationBuilder<any> {
    /**
     * bootstrap ioc module.
     *
     * @template T
     * @param {Token<T>} token
     * @param {AnnotationConfigure<T>} config
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof AnyBootstrapBuilder
     */
    build<T>(token: Token<T>, config: AnnotationConfigure<T>, data?: any): Promise<T>;
}
