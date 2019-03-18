import {
    Token, Type, Express, IocCoreService, getClassDecorators, isClass,
    getTypeMetadata, isToken, Singleton, InjectReference
} from '@ts-ioc/ioc';
import { IContainer } from '@ts-ioc/core';
import { IMetaAccessor, ModuleConfigure } from '../modules';


/**
 * class metadata accessor.
 *
 * @export
 * @class MetaAccessor
 * @implements {IMetaAccessor<any>}
 */
@Singleton
export class MetaAccessor extends IocCoreService implements IMetaAccessor {

    getDecorators(type: Type<any>): string[] {
        return getClassDecorators(type);
    }

    /**
     * get metadata config of target type. via decorators in order.
     *
     * @param {Token<any>} token
     * @param {IContainer} container
     * @param {ModuleConfigure} [extConfig]
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {ModuleConfigure}
     * @memberof MetaAccessor
     */
    getMetadata(token: Token<any>, container: IContainer, extConfig?: ModuleConfigure, decorFilter?: Express<string, boolean>): ModuleConfigure {
        let type = isClass(token) ? token : container.getTokenProvider(token);
        let cfg;
        if (isClass(type)) {
            let decors = this.getDecorators(type);
            if (decorFilter) {
                decors = decors.filter(decorFilter);
            }
            let classmeta = {};
            decors.forEach(decor => {
                let metas = getTypeMetadata<ModuleConfigure>(decor, type);
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
     * @param {Express<ModuleConfigure, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {ModuleConfigure}
     * @memberof MetaAccessor
     */
    find(token: Token<any>, container: IContainer, filter: Express<ModuleConfigure, boolean>, decorFilter?: Express<string, boolean>): ModuleConfigure {
        let type = isClass(token) ? token : container.getTokenProvider(token);
        let metadata = null;
        if (isClass(type)) {
            let decors = this.getDecorators(type);
            if (decorFilter) {
                decors = decors.filter(decorFilter);
            }
            decors.some(decor => {
                let metas = getTypeMetadata<ModuleConfigure>(decor, type);
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
     * @param {Express<ModuleConfigure, boolean>} filter
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {ModuleConfigure[]}
     * @memberof MetaAccessor
     */
    filter(token: Token<any>, container: IContainer, filter: Express<ModuleConfigure, boolean>, decorFilter?: Express<string, boolean>): ModuleConfigure[] {
        let type = isClass(token) ? token : container.getTokenProvider(token);
        let metadatas = [];
        if (isClass(type)) {
            let decors = this.getDecorators(type);
            if (decorFilter) {
                decors = decors.filter(decorFilter);
            }
            decors.forEach(decor => {
                let metas = getTypeMetadata<ModuleConfigure>(decor, type);
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
     * @param {ModuleConfigure} config
     * @param {IContainer} [container] vaild token in container or not.
     * @returns {Token<any>}
     * @memberof MetadataManager
     */
    getToken(config: ModuleConfigure, container?: IContainer): Token<any> {
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
     * @param {ModuleConfigure} config
     * @param {IContainer} [container]  vaild container.
     * @returns {Token<any>}
     * @memberof ModuelValidate
     */
    getBootToken(config: ModuleConfigure, container?: IContainer): Token<any> {
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

    protected getTokenInConfig(config: ModuleConfigure): Token<any> {
        return config.token || config.type;
    }

    protected getBootTokenInConfig(config: ModuleConfigure) {
        return config.bootstrap;
    }

}


/**
 * inject module meta accessor token.
 *
 * @export
 * @class InjectModuleBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectMetaAccessorToken<T> extends InjectReference<MetaAccessor> {
    constructor(type: Token<T>) {
        super(MetaAccessor, type);
    }
}
