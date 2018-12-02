import { AnnotationConfigure, AnnotationBuilderToken } from './IAnnotationBuilder';
import { Token, RefRegistration, Injectable, Inject, ContainerToken, IContainer, AnnotationMetaAccessorToken, Express, lang } from '@ts-ioc/core';

/**
 * metadata manager.
 *
 * @export
 * @interface IMetadataManager
 */
export interface IMetadataManager {
    /**
     * get token of metadata.
     *
     * @param {AnnotationConfigure<any>} config
     * @returns {Token<any>}
     * @memberof IMetadataManager
     */
    getToken(config: AnnotationConfigure<any>): Token<any>;

     /**
     * get metadata config.
     *
     * @param {Token<any>} token
     * @param {AnnotationConfigure<any>} [config]
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {AnnotationConfigure<any>}
     * @memberof IMetadataManager
     */
    getMetaConfig(token: Token<any>, config?: AnnotationConfigure<any>, decorFilter?: Express<string, boolean>): AnnotationConfigure<any>;

    /**
     * get metadata config.
     *
     * @param {Token<any>} token
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {AnnotationConfigure<any>}
     * @memberof IMetadataManager
     */
    getMetadata(token: Token<any>, decorFilter?: Express<string, boolean>): AnnotationConfigure<any>
}

/**
 * Metadata Manager token.
 *
 * @export
 * @class InjectMetadataManagerToken
 * @extends {RefRegistration<IMetadataManager>}
 * @template T
 */
export class InjectMetadataManagerToken<T extends IMetadataManager> extends RefRegistration<T> {
    constructor(type: Token<any>) {
        super(type, 'MetadataManager');
    }
}

/**
 * annotation metadata manager token.
 */
export const AnnotationMetadataManagerToken = new InjectMetadataManagerToken(AnnotationBuilderToken);

/**
 * metadata manager.
 *
 * @export
 * @class MetadataManager
 * @implements {IMetadataManager}
 */
@Injectable(AnnotationMetadataManagerToken)
export class MetadataManager implements IMetadataManager {
    /**
    * ioc container.
    *
    * @type {IContainer}
    * @memberof BootBuilder
    */
    @Inject(ContainerToken)
    protected container: IContainer;

    /**
     * get token of metadata config.
     *
     * @param {AnnotationConfigure<any>} config
     * @returns {Token<any>}
     * @memberof MetadataManager
     */
    getToken(config: AnnotationConfigure<any>): Token<any> {
        return config.token || config.type;
    }

    /**
     * get metadata config.
     *
     * @param {Token<any>} token
     * @param {AnnotationConfigure<any>} [config]
     * @param {Express<string, boolean>} [decorFilter]
     * @returns {AnnotationConfigure<any>}
     * @memberof MetadataManager
     */
    getMetaConfig(token: Token<any>, config?: AnnotationConfigure<any>, decorFilter?: Express<string, boolean>): AnnotationConfigure<any> {
        let cfg = this.getMetadata(token, decorFilter);
        if (cfg) {
            return lang.assign({}, cfg, config || {});
        } else {
            return config || {};
        }
    }

    /**
     * get metadata config.
     *
     * @param {Token<any>} token
     * @param {string} [decorator]
     * @returns {AnnotationConfigure<any>}
     * @memberof MetadataManager
     */
    getMetadata(token: Token<any>, decorFilter?: Express<string, boolean>): AnnotationConfigure<any> {
        let accessor = this.container.resolve(AnnotationMetaAccessorToken);
        if (accessor) {
            return accessor.getMetadata(token, this.container, decorFilter);
        }
        return null;
    }
}
