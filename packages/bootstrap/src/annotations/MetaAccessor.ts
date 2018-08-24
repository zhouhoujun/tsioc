import { Registration, Token, Injectable, getTypeMetadata, IContainer, isClass, isToken, Providers } from '@ts-ioc/core';
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
     * get metadata config of target type.
     *
     * @param {Token<T>} type
     * @param {IContainer} container
     * @returns {AnnotationConfigure<T>}
     * @memberof IMetaAccessor
     */
    getMetadata(type: Token<T>, container: IContainer): AnnotationConfigure<T>;
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

    getMetadata(token: Token<any>, container: IContainer): AnnotationConfigure<any> {
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


/**
 * Annotation MetaAccessor token.
 */
export const AnnotationMetaAccessorToken = new InjectMetaAccessorToken<any>('Annotation');

/**
 * Annotation MetaAccessor.
 *
 * @export
 * @class AnnotationMetaAccessor
 * @implements {IMetaAccessor<any>}
 */
@Injectable(AnnotationMetaAccessorToken)
export class AnnotationMetaAccessor implements IMetaAccessor<any> {
    constructor(private decorator: string) {

    }
    getMetadata(token: Token<any>, container: IContainer): AnnotationConfigure<any> {
        if (isToken(token)) {
            let accessor: IMetaAccessor<any>;
            let provider = { decorator: this.decorator };
            container.getTokenExtendsChain(token).forEach(tk => {
                if (accessor) {
                    return false;
                }
                let accToken = new InjectMetaAccessorToken<any>(tk);
                if (container.has(accToken)) {
                    accessor = container.resolve(accToken, provider);
                }
                return true;
            });
            if (!accessor) {
                accessor = this.getDefaultMetaAccessor(container, provider);
            }
            if (accessor) {
                return accessor.getMetadata(token, container);
            } else {
                return null;
            }
        }
        return null;
    }

    protected getDefaultMetaAccessor(container: IContainer, ...providers: Providers[]) {
        return container.resolve(DefaultMetaAccessorToken, ...providers);
    }
}
