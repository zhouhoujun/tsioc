import { ClassMetadata } from '../core';
import { Token, Type, Express } from '../types';
import { IContainer } from '../IContainer';
import { RefRegistration } from '../InjectReference';

/**
 * annotation metadata.
 *
 * @export
 * @interface IAnnotationMetadata
 * @extends {ClassMetadata}
 * @template T
 */
export interface IAnnotationMetadata<T> extends ClassMetadata {

    /**
     * annotation for the type.
     *
     * @type {Token<T>}
     * @memberof AnnotationConfigure
     */
    token?: Token<T>;
    /**
     * Annotation class Type.
     *
     * @type {Type<T>}
     * @memberof IAnnotationMetadata
     */
    type?: Type<T>;

    /**
     * bootstrap.
     *
     * @type {Token<T>}
     * @memberof IAnnotationMetadata
     */
    bootstrap?: Token<T>;
}

/**
 * module metadata accessor
 *
 * @export
 * @interface IMetaAccessor
 * @template T
 */
export interface IMetaAccessor<T> {
    /**
     * get then first decorator metadata contain via decorators in order.
     *
     * @param {Type<T>} type
     * @returns {string[]}
     * @memberof IMetaAccessor
     */
    getDecorators(type: Type<T>): string[];

    /**
     * get metadata config of target type. via decorators in order.
     *
     * @param {Token<T>} type
     * @param {IContainer} container
     * @param {IAnnotationMetadata<T>} [extConfig] ext config to merge with metadata.
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<T>}
     * @memberof IMetaAccessor
     */
    getMetadata(type: Token<T>, container: IContainer, extConfig?: IAnnotationMetadata<T>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<T>;

    /**
     * find metadata.
     *
     * @param {Token<T>} type
     * @param {IContainer} container
     * @param {Express<IAnnotationMetadata<T>, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<T>}
     * @memberof IMetaAccessor
     */
    find(type: Token<T>, container: IContainer, filter: Express<IAnnotationMetadata<T>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<T>;

    /**
     * filter metadata.
     *
     * @param {Token<T>} type
     * @param {IContainer} container
     * @param {Express<IAnnotationMetadata<T>, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<T>[]}
     * @memberof IMetaAccessor
     */
    filter(type: Token<T>, container: IContainer, filter: Express<IAnnotationMetadata<T>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<T>[];

    /**
     * get token of metadata.
     *
     * @param {AnnotationConfigure<any>} config
     * @returns {Token<any>}
     * @memberof IMetadataManager
     */
    getToken(config: IAnnotationMetadata<any>, container?: IContainer): Token<any>;

    /**
     * get boot token of module config.
     *
     * @param {IAnnotationMetadata<any>} cfg
     * @param {IContainer} [container]
     * @returns {Token<any>}
     * @memberof IModuleValidate
     */
    getBootToken(cfg: IAnnotationMetadata<any>, container?: IContainer): Token<any>
}

/**
 * application service token.
 *
 * @export
 * @class InjectMetaAccessorToken
 * @extends {Registration<MetaAccessor<T>>}
 * @template T
 */
export class InjectMetaAccessorToken<T> extends RefRegistration<IMetaAccessor<T>> {
    constructor(type: Token<T>) {
        super(type, 'metaAccessor');
    }
}

/**
 * MetaAccessor token.
 */
export const MetaAccessorToken = new InjectMetaAccessorToken<any>(Object);
