
import { Injectable, getTypeMetadata, hasOwnClassMetadata } from '../core';
import { Token } from '../types';
import { IContainer } from '../IContainer';
import { isClass, isToken, isArray } from '../utils';
import { DefaultMetaAccessorToken, IMetaAccessor, IAnnotationMetadata, AnnotationMetaAccessorToken, InjectMetaAccessorToken } from './IMetaAccessor';

@Injectable(DefaultMetaAccessorToken)
export class MetaAccessor implements IMetaAccessor<any> {

    protected decorators: string[];
    constructor(decorator: string | string[]) {
        this.decorators = isArray(decorator) ? decorator : [decorator];
    }

    getDecorators(): string[] {
        return this.decorators;
    }

    getMetadata(token: Token<any>, container: IContainer): IAnnotationMetadata<any> {
        let type = isClass(token) ? token : container.getTokenImpl(token);
        if (isClass(type)) {
            let decorators = this.getDecorators();
            let firstDecor = decorators.find(decor => hasOwnClassMetadata(decor, type));

            let metas = getTypeMetadata<IAnnotationMetadata<any>>(firstDecor, type);
            if (metas && metas.length) {
                let meta = metas[0];
                return meta;
            }
        }
        return {};
    }
}



/**
 * Annotation MetaAccessor.
 *
 * @export
 * @class AnnotationMetaAccessor
 * @implements {IMetaAccessor<any>}
 */
@Injectable(AnnotationMetaAccessorToken)
export class AnnotationMetaAccessor implements IMetaAccessor<any> {

    protected decorators: string[];
    constructor(decorator: string | string[]) {
        this.decorators = isArray(decorator) ? decorator : [decorator];
    }

    getDecorators(): string[] {
        return this.decorators;
    }

    getMetadata(token: Token<any>, container: IContainer): IAnnotationMetadata<any> {
        if (isToken(token)) {
            let provider = { decorator: this.getDecorators() };
            let accessor = container.getRefService(InjectMetaAccessorToken, token, DefaultMetaAccessorToken, provider);
            if (accessor) {
                return accessor.getMetadata(token, container);
            } else {
                return {};
            }
        }
        return {};
    }
}
