

import { Token, Type, Express } from '../types';
import { IContainer } from '../IContainer';
import { isClass, isToken, lang } from '../utils';
import { DefaultMetaAccessorToken, IMetaAccessor, IAnnotationMetadata, InjectMetaAccessorToken } from './IMetaAccessor';
import { getClassDecorators, getTypeMetadata } from './factories';


/**
 * class metadata accessor.
 *
 * @export
 * @class MetaAccessor
 * @implements {IMetaAccessor<any>}
 */
export class MetaAccessor implements IMetaAccessor<any> {

    constructor() {
    }

    getDecorators(type: Type<any>): string[] {
        return getClassDecorators(type);
    }

    getMetadata(token: Token<any>, container: IContainer, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any> {
        let type = isClass(token) ? token : container.getTokenImpl(token);
        if (isClass(type)) {
            let decors = this.getDecorators(type);
            if (decorFilter) {
                decors = decors.filter(decorFilter);
            }
            let classmeta = {};
            decors.forEach(decor => {
                let metas = getTypeMetadata<IAnnotationMetadata<any>>(decor, type);
                if (metas && metas.length) {
                    metas.forEach(meta => {
                        if (meta) {
                            classmeta = lang.assign({}, classmeta, meta);
                        }
                    });
                }
            });
            return classmeta;
        }
        return {};
    }

    find(token: Token<any>, container: IContainer, filter: Express<IAnnotationMetadata<any>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any> {
        let type = isClass(token) ? token : container.getTokenImpl(token);
        let metadata = null;
        if (isClass(type)) {
            let decors = this.getDecorators(type);
            if (decorFilter) {
                decors = decors.filter(decorFilter);
            }
            decors.forEach(decor => {
                let metas = getTypeMetadata<IAnnotationMetadata<any>>(decor, type);
                if (metas && metas.length) {
                    metas.forEach(meta => {
                        if (metadata) {
                            return false;
                        }
                        if (meta && filter(meta)) {
                            metadata = meta;
                        }
                        return true;
                    });
                }
            });
        }
        return metadata;
    }

    filter(token: Token<any>, container: IContainer, filter: Express<IAnnotationMetadata<any>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any>[] {
        let type = isClass(token) ? token : container.getTokenImpl(token);
        let metadatas = [];
        if (isClass(type)) {
            let decors = this.getDecorators(type);
            if (decorFilter) {
                decors = decors.filter(decorFilter);
            }
            decors.forEach(decor => {
                let metas = getTypeMetadata<IAnnotationMetadata<any>>(decor, type);
                if (metas && metas.length) {
                    metas.forEach(meta => {
                        if (meta && filter(meta)) {
                            metadatas.push(meta);
                        }
                        return true;
                    });
                }
            });
        }
        return metadatas;
    }
}



/**
 * Annotation MetaAccessor.
 *
 * @export
 * @class AnnotationMetaAccessor
 * @implements {IMetaAccessor<any>}
 */
export class AnnotationMetaAccessor extends MetaAccessor implements IMetaAccessor<any> {

    constructor() {
        super();
    }

    getMetadata(token: Token<any>, container: IContainer, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any> {
        if (isToken(token)) {
            let accessor = container.getRefService(InjectMetaAccessorToken, token, DefaultMetaAccessorToken);
            if (accessor) {
                return accessor.getMetadata(token, container, decorFilter);
            } else {
                return super.getMetadata(token, container, decorFilter);
            }
        }
        return {};
    }

    find(token: Token<any>, container: IContainer, filter: Express<IAnnotationMetadata<any>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any> {
        if (isToken(token)) {
            let accessor = container.getRefService(InjectMetaAccessorToken, token, DefaultMetaAccessorToken);
            if (accessor) {
                return accessor.find(token, container, filter, decorFilter);
            } else {
                return super.find(token, container, filter, decorFilter);
            }
        }
        return null;
    }

    filter(token: Token<any>, container: IContainer, filter: Express<IAnnotationMetadata<any>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any>[] {
        if (isToken(token)) {
            let accessor = container.getRefService(InjectMetaAccessorToken, token, DefaultMetaAccessorToken);
            if (accessor) {
                return accessor.filter(token, container, filter, decorFilter);
            } else {
                return super.filter(token, container, filter, decorFilter);
            }
        }
        return [];
    }
}
