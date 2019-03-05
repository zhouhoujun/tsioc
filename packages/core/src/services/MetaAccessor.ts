import {
    ComponentMetadata, Token, Type, Express, IocCoreService,
    getClassDecorators, isClass, getTypeMetadata, isToken
} from '@ts-ioc/ioc';
import { IContainer } from '../IContainer';

/**
 * annotation metadata.
 *
 * @export
 * @interface IAnnotationMetadata
 * @extends {ClassMetadata}
 * @template T
 */
export interface IAnnotationMetadata<T> extends ComponentMetadata {
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
 * class metadata accessor.
 *
 * @export
 * @class MetaAccessor
 * @implements {IMetaAccessor<any>}
 */
export class MetaAccessor extends IocCoreService {

    constructor() {
        super();
    }

    getDecorators(type: Type<any>): string[] {
        return getClassDecorators(type);
    }

    /**
     * get metadata config of target type. via decorators in order.
     *
     * @param {Token<any>} token
     * @param {IContainer} container
     * @param {IAnnotationMetadata<any>} [extConfig]
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<any>}
     * @memberof MetaAccessor
     */
    getMetadata(token: Token<any>, container: IContainer, extConfig?: IAnnotationMetadata<any>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any> {
        let type = isClass(token) ? token : container.getTokenProvider(token);
        let cfg;
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
                            classmeta = Object.assign({}, classmeta, meta);
                        }
                    });
                }
            });
            cfg = classmeta;
        }
        if (cfg) {
            return Object.assign({}, cfg, extConfig || {});
        } else {
            return extConfig || {};
        }
    }

    /**
     * find metadata accessor.
     *
     * @param {Token<any>} token
     * @param {IContainer} container
     * @param {Express<IAnnotationMetadata<any>, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<any>}
     * @memberof MetaAccessor
     */
    find(token: Token<any>, container: IContainer, filter: Express<IAnnotationMetadata<any>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any> {
        let type = isClass(token) ? token : container.getTokenProvider(token);
        let metadata = null;
        if (isClass(type)) {
            let decors = this.getDecorators(type);
            if (decorFilter) {
                decors = decors.filter(decorFilter);
            }
            decors.some(decor => {
                let metas = getTypeMetadata<IAnnotationMetadata<any>>(decor, type);
                if (metas && metas.length) {
                    return metas.some(meta => {
                        if (meta && filter(meta)) {
                            metadata = meta;
                        }
                        return !!metadata;
                    });
                }
                return false;
            });
        }
        return metadata;
    }

    /**
     * filter metadata accessor.
     *
     * @param {Token<any>} token
     * @param {IContainer} container
     * @param {Express<IAnnotationMetadata<any>, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<any>[]}
     * @memberof MetaAccessor
     */
    filter(token: Token<any>, container: IContainer, filter: Express<IAnnotationMetadata<any>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any>[] {
        let type = isClass(token) ? token : container.getTokenProvider(token);
        let metadatas = [];
        if (isClass(type)) {
            let decors = this.getDecorators(type);
            if (decorFilter) {
                decors = decors.filter(decorFilter);
            }
            decors.forEach(decor => {
                let metas = getTypeMetadata<IAnnotationMetadata<any>>(decor, type);
                if (metas && metas.length) {
                    metas.filter(meta => meta && filter(meta)).forEach(meta => {
                        metadatas.push(meta);
                    });
                }
            });
        }
        return metadatas;
    }

    /**
     * get token of metadata config.
     *
     * @param {IAnnotationMetadata<any>} config
     * @param {IContainer} [container] vaild token in container or not.
     * @returns {Token<any>}
     * @memberof MetadataManager
     */
    getToken(config: IAnnotationMetadata<any>, container?: IContainer): Token<any> {
        let token = this.getTokenInConfig(config);
        if (this.validateToken(token, container)) {
            return token;
        } else {
            return null;
        }
    }

    /**
     * get module boot token from module configure.
     *
     * @param {IAnnotationMetadata<any>} config
     * @param {IContainer} [container]  vaild container.
     * @returns {Token<any>}
     * @memberof ModuelValidate
     */
    getBootToken(config: IAnnotationMetadata<any>, container?: IContainer): Token<any> {
        let token = this.getBootTokenInConfig(config);
        if (this.validateToken(token, container)) {
            return token
        } else {
            return null;
        }
    }

    protected validateToken(token: Token<any>, container?: IContainer): boolean {
        return isToken(token);
    }

    protected getTokenInConfig(config: IAnnotationMetadata<any>): Token<any> {
        return config.token || config.type;
    }

    protected getBootTokenInConfig(config: IAnnotationMetadata<any>) {
        return config.bootstrap;
    }

}
