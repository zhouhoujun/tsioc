import { Token, Type, Express } from '../types';
import { IIocContainer } from '../IIocContainer';
import { ComponentMetadata } from '../metadatas';
import { isClass, isToken } from '../utils';
import { getTypeMetadata, getClassDecorators } from '../factories';
import { IocCoreService } from './IocCoreService';

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
     * @param {IIocContainer} container
     * @param {IAnnotationMetadata<T>} [extConfig] ext config to merge with metadata.
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<T>}
     * @memberof IMetaAccessor
     */
    getMetadata(type: Token<T>, container: IIocContainer, extConfig?: IAnnotationMetadata<T>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<T>;

    /**
     * find metadata.
     *
     * @param {Token<T>} type
     * @param {IIocContainer} container
     * @param {Express<IAnnotationMetadata<T>, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<T>}
     * @memberof IMetaAccessor
     */
    find(type: Token<T>, container: IIocContainer, filter: Express<IAnnotationMetadata<T>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<T>;

    /**
     * filter metadata.
     *
     * @param {Token<T>} type
     * @param {IIocContainer} container
     * @param {Express<IAnnotationMetadata<T>, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<T>[]}
     * @memberof IMetaAccessor
     */
    filter(type: Token<T>, container: IIocContainer, filter: Express<IAnnotationMetadata<T>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<T>[];

    /**
     * get token of metadata.
     *
     * @param {AnnotationConfigure<any>} config
     * @returns {Token<any>}
     * @param {IIocContainer} [container]  vaild container.
     * @memberof IMetadataManager
     */
    getToken(config: IAnnotationMetadata<any>, container?: IIocContainer): Token<any>;

    /**
     * get boot token of module config.
     *
     * @param {IAnnotationMetadata<any>} cfg
     * @param {IIocContainer} [container]  vaild container.
     * @returns {Token<any>}
     * @memberof IModuleValidate
     */
    getBootToken(cfg: IAnnotationMetadata<any>, container?: IIocContainer): Token<any>
}


/**
 * class metadata accessor.
 *
 * @export
 * @class MetaAccessor
 * @implements {IMetaAccessor<any>}
 */
export class MetaAccessor extends IocCoreService implements IMetaAccessor<any> {

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
     * @param {IIocContainer} container
     * @param {IAnnotationMetadata<any>} [extConfig]
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<any>}
     * @memberof MetaAccessor
     */
    getMetadata(token: Token<any>, container: IIocContainer, extConfig?: IAnnotationMetadata<any>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any> {
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
     * @param {IIocContainer} container
     * @param {Express<IAnnotationMetadata<any>, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<any>}
     * @memberof MetaAccessor
     */
    find(token: Token<any>, container: IIocContainer, filter: Express<IAnnotationMetadata<any>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any> {
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
     * @param {IIocContainer} container
     * @param {Express<IAnnotationMetadata<any>, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {IAnnotationMetadata<any>[]}
     * @memberof MetaAccessor
     */
    filter(token: Token<any>, container: IIocContainer, filter: Express<IAnnotationMetadata<any>, boolean>, decorFilter?: Express<string, boolean>): IAnnotationMetadata<any>[] {
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
     * @param {IIocContainer} [container] vaild token in container or not.
     * @returns {Token<any>}
     * @memberof MetadataManager
     */
    getToken(config: IAnnotationMetadata<any>, container?: IIocContainer): Token<any> {
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
     * @param {IIocContainer} [container]  vaild container.
     * @returns {Token<any>}
     * @memberof ModuelValidate
     */
    getBootToken(config: IAnnotationMetadata<any>, container?: IIocContainer): Token<any> {
        let token = this.getBootTokenInConfig(config);
        if (this.validateToken(token, container)) {
            return token
        } else {
            return null;
        }
    }

    protected validateToken(token: Token<any>, container?: IIocContainer): boolean {
        return isToken(token);
    }

    protected getTokenInConfig(config: IAnnotationMetadata<any>): Token<any> {
        return config.token || config.type;
    }

    protected getBootTokenInConfig(config: IAnnotationMetadata<any>) {
        return config.bootstrap;
    }

}
