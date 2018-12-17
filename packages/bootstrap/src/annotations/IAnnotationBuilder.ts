import { IContainer, Token, RefRegistration } from '@ts-ioc/core';
import { Runnable } from '../runnable';
import { AnnoTokenVaild, AnnoBuildCompleted } from './AnnoType';
import { AnnotationConfigure } from './AnnotationConfigure';

const annoBuilderDesc = 'DI_AnnotationBuilder';

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
     * @memberof IAnnotationBuilder
     */
    container: IContainer;

    /**
     * build token type via config.
     *
     * @param {Token<T>} token
     * @param {AnnotationConfigure<T>} [config]
     * @param {*} [target] build data
     * @returns {Promise<T>}
     * @memberof ITypeBuilder
     */
    build(token: Token<T>, config?: AnnotationConfigure<T>, target?: any, completed?: AnnoBuildCompleted<T>): Promise<T>;

    /**
     * build instance via type config.
     *
     * @param {(Token<T> | AnnotationConfigure<T>)} config
     * @param {*} [data] build data.
     * @returns {Promise<T>}
     * @memberof IAnnotationBuilder
     */
    buildByConfig(config: Token<T> | AnnotationConfigure<T>, target?: any, vaild?: AnnoTokenVaild<T>): Promise<T>;
    /**
     * get finally builder by token and config.
     *
     * @param {Token<T>} token
     * @param {AnnotationConfigure<T>} [config]
     * @returns {IAnnotationBuilder<T>}
     * @memberof IBootBuilder
     */
    getBuilder(token: Token<T>, config?: AnnotationConfigure<T>): IAnnotationBuilder<T>;
    /**
     * create token instance.
     *
     * @param {Token<T>} token
     * @param {AnnotationConfigure<T>} config
     * @param {*} [data] the data to init instance.
     * @returns {Promise<T>}
     * @memberof IAnnotationBuilder
     */
    createInstance(token: Token<T>, config: AnnotationConfigure<T>, data?: any): Promise<T>;
    /**
     * bundle bootstrap instance via config.
     *
     * @param {T} instance
     * @param {AnnotationConfigure<T>} config
     * @param {*} [data] the data to init instance.
     * @returns {Promise<T>}
     * @memberof IAnnotationBuilder
     */
    buildStrategy(instance: T, config: AnnotationConfigure<T>, data?: any): Promise<T>;

    /**
     * run runable.
     *
     * @param {Token<T>} runable
     * @param {AnnotationConfigure<T>} config
     * @param {*} [data]
     * @returns {Promise<Runnable<T>>}
     * @memberof IAnnotationBuilder
     */
    boot(runable: Token<T>, config: AnnotationConfigure<T>, data?: any): Promise<Runnable<T>>;

    /**
     * run runable.
     *
     * @param {AnnotationConfigure<T>} runable
     * @param {*} [data] bootstrap data, build data, Runnable data.
     * @returns {Promise<Runnable<T>>}
     * @memberof IAnnotationBuilder
     */
    boot(runable: AnnotationConfigure<T>, data?: any): Promise<Runnable<T>>;

    /**
     * reolve runable
     *
     * @param {T} instance
     * @param {AnnotationConfigure<T>} [config]
     * @param {Token<T>} [token]
     * @returns {Runnable<T>}
     * @memberof IAnnotationBuilder
     */
    resolveRunable(instance: T, config?: AnnotationConfigure<T>, token?: Token<T>): Runnable<T>;

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

/**
 * inject Annotation class builder.
 *
 * @export
 * @class InjectBootstrapBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectAnnotationBuilder<T> extends RefRegistration<IAnnotationBuilder<T>> {
    constructor(type: Token<T>) {
        super(type, annoBuilderDesc);
    }
}

/**
 * Annotation class builder token.
 */
export const AnnotationBuilderToken = new InjectAnnotationBuilder<any>('');

/**
 * Default Annotation class builder token.
 */
export const DefaultAnnotationBuilderToken = new InjectAnnotationBuilder<any>('default');
