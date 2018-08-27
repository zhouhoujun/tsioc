import { ClassMetadata } from '../core';
import { Token, Type } from '../types';
import { IContainer } from '../IContainer';
import { Registration } from '../Registration';

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
     * @returns {(string | string[])}
     * @memberof IMetaAccessor
     */
    getDecorators(): string[];
    /**
     * get metadata config of target type. via decorators in order.
     *
     * @param {Token<T>} type
     * @param {IContainer} container
     * @returns {IAnnotationMetadata<T>}
     * @memberof IMetaAccessor
     */
    getMetadata(type: Token<T>, container: IContainer): IAnnotationMetadata<T>;
}

/**
 * application service token.
 *
 * @export
 * @class InjectMetaAccessorToken
 * @extends {Registration<MetaAccessor<T>>}
 * @template T
 */
export class InjectMetaAccessorToken<T> extends Registration<IMetaAccessor<T>> {
    constructor(type: Token<T>) {
        super(type, 'boot__metaAccessor');
    }
}

/**
 * default MetaAccessor token.
 */
export const DefaultMetaAccessorToken = new InjectMetaAccessorToken<any>('default');

/**
 * Annotation MetaAccessor token.
 */
export const AnnotationMetaAccessorToken = new InjectMetaAccessorToken<any>('Annotation');
