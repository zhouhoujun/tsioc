import { IContainer, Token, RefRegistration, IMetaAccessor } from '@ts-ioc/core';
import { Runnable } from '../runnable';
import { BuildOptions } from './AnnoType';
import { AnnotationConfigure } from './AnnotationConfigure';

const annoBuilderDesc = 'DI_AnnotationBuilder';

/**
 * Annotation class builder.
 *
 * @export
 * @interface IAnnotationBuilder
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
     * build annotation class.
     *
     * @param {Token<T>} token
     * @param {BuildOptions<T>} [options]
     * @returns {Promise<T>}
     * @memberof IAnnotationBuilder
     */
    build(token: Token<T>, options?: BuildOptions<T>): Promise<T>;

    /**
     * build annotation class.
     *
     * @param {AnnotationConfigure<T>} config
     * @param {BuildOptions<T>} [options]
     * @returns {Promise<T>}
     * @memberof IAnnotationBuilder
     */
    build(config: AnnotationConfigure<T>,  options?: BuildOptions<T>): Promise<T>;

    /**
     * build annotation class.
     *
     * @param {Token<T>} token
     * @param {AnnotationConfigure<T>} [config]
     * @param {BuildOptions<T>} [options]
     * @returns {Promise<T>}
     * @memberof IAnnotationBuilder
     */
    build(token: Token<T>, config: AnnotationConfigure<T>, options: BuildOptions<T>): Promise<T>;

    /**
     * get finally builder by token and config.
     *
     * @param {Token<T>} token
     * @param {AnnotationConfigure<T>} [config]
     * @param {BuildOptions<T>} [options]
     * @returns {IAnnotationBuilder<T>}
     * @memberof IAnnotationBuilder
     */
    getBuilder(token: Token<T>, config?: AnnotationConfigure<T>, options?: BuildOptions<T>): IAnnotationBuilder<T>;
    /**
     * create token instance.
     *
     * @param {Token<T>} token
     * @param {AnnotationConfigure<T>} config
     * @param {BuildOptions<T>} [options] the  build options to create instance.
     * @returns {Promise<T>}
     * @memberof IAnnotationBuilder
     */
    createInstance(token: Token<T>, config: AnnotationConfigure<T>, options?: BuildOptions<T>): Promise<T>;

    /**
     * run runable.
     *
     * @param {AnnotationConfigure<T>} runable
     * @param {BuildOptions<T>} [options] the build options build instance.
     * @returns {Promise<Runnable<T>>}
     * @memberof IAnnotationBuilder
     */
    boot(runable: AnnotationConfigure<T>, options?: BuildOptions<T>): Promise<Runnable<T>>;

    /**
     * run runable.
     *
     * @param {Token<T>} runable
     * @param {BuildOptions<T>} [options]
     * @returns {Promise<Runnable<T>>}
     * @memberof IAnnotationBuilder
     */
    boot(runable: Token<T>, options?: BuildOptions<T>): Promise<Runnable<T>>;

    /**
     * run runable.
     *
     * @param {Token<T>} runable
     * @param {AnnotationConfigure<T>} config
     * @param {BuildOptions<T>} options the build options build instance.
     * @returns {Promise<Runnable<T>>}
     * @memberof IAnnotationBuilder
     */
    boot(runable: Token<T>, config: AnnotationConfigure<T>, options: BuildOptions<T>): Promise<Runnable<T>>;

    /**
     * resove runnable.
     *
     * @param {T} instance
     * @param {AnnotationConfigure<T>} [config]
     * @param {BuildOptions<T>} [options]
     * @returns {Runnable<T>}
     * @memberof IAnnotationBuilder
     */
    resolveRunable(instance: T, config?: AnnotationConfigure<T>, options?: BuildOptions<T>): Runnable<T>;

    /**
     * reolve runable
     *
     * @param {T} instance
     * @param {AnnotationConfigure<T>} [config]
     * @param {Token<T>} [token]
     * @param {BuildOptions<T>} [options]
     * @returns {Runnable<T>}
     * @memberof IAnnotationBuilder
     */
    resolveRunable(instance: T, config?: AnnotationConfigure<T>, token?: Token<T>, options?: BuildOptions<T>): Runnable<T>;


    /**
     * get meta accessor.
     *
     * @param {Token<any>} token
     * @returns {IMetaAccessor<any>}
     * @memberof IAnnotationBuilder
     */
    getMetaAccessor(token: Token<any>): IMetaAccessor<any>;
    /**
     * get meta accessor.
     *
     * @param {AnnotationConfigure<T>} config
     * @returns {IMetaAccessor<any>}
     * @memberof IAnnotationBuilder
     */
    getMetaAccessor(config: AnnotationConfigure<T>): IMetaAccessor<any>;
    /**
     * get meta accessor.
     *
     * @param {Token<any>} token
     * @param {AnnotationConfigure<T>} config
     * @returns {IMetaAccessor<any>}
     * @memberof IAnnotationBuilder
     */
    getMetaAccessor(token: Token<any>, config: AnnotationConfigure<T>): IMetaAccessor<any>;
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
