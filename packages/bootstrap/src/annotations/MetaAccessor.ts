import { Registration, Token, Injectable, getTypeMetadata, IContainer, isClass } from '@ts-ioc/core';
import { AnnotationConfigure } from './AnnotationConfigure';

/**
 * module metadata accessor
 *
 * @export
 * @interface IMetaAccessor
 * @template T
 */
export interface IMetaAccessor<T> {
    /**
     * get metadata of target type.
     *
     * @param {IContainer} container
     * @param {Token<T>} type
     * @returns {AnnotationConfigure<T>}
     * @memberof IMetaAccessor
     */
    get(container: IContainer, type: Token<T>): AnnotationConfigure<T>;
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

@Injectable(DefaultMetaAccessorToken)
export class MetaAccessor implements IMetaAccessor<any> {

    constructor(private decorator: string) {

    }

    get(container: IContainer, token: Token<any>): AnnotationConfigure<any> {
        let type = isClass(token) ? token : container.getTokenImpl(token);
        if (isClass(type)) {
            let metas = getTypeMetadata<AnnotationConfigure<any>>(this.decorator, type);
            if (metas && metas.length) {
                let meta = metas[0];
                return meta;
            }
        }
        return null;
    }
}
