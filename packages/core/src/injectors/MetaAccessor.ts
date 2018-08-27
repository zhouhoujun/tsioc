
import { Injectable, getTypeMetadata, hasOwnClassMetadata } from '../core';
import { Token, Providers } from '../types';
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
            let accessor: IMetaAccessor<any>;
            let provider = { decorator: this.getDecorators() };
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
                return {};
            }
        }
        return {};
    }

    protected getDefaultMetaAccessor(container: IContainer, ...providers: Providers[]) {
        return container.resolve(DefaultMetaAccessorToken, ...providers);
    }
}
