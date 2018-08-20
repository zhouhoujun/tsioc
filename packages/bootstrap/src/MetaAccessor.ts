import { ModuleConfig, ModuleConfigure } from './ModuleConfigure';
import { Registration, Token, Injectable, getTypeMetadata, Inject, ContainerToken, IContainer, isClass } from '@ts-ioc/core';

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
     * @returns {ModuleConfig<T>}
     * @memberof IMetaAccessor
     */
    get(container: IContainer, type: Token<T>): ModuleConfig<T>;
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

    get(container: IContainer, token: Token<any>): ModuleConfig<any> {
        let type = isClass(token) ? token : container.getTokenImpl(token);
        if (isClass(type)) {
            let metas = getTypeMetadata<ModuleConfigure>(this.decorator, type);
            if (metas && metas.length) {
                let meta = metas[0];
                return meta;
            }
        }
        return null;
    }
}
