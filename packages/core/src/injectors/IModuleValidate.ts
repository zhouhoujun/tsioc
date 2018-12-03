import { Type, Token } from '../types';
import { IAnnotationMetadata, IMetaAccessor } from '../core';
import { IContainer } from '../IContainer';
import { RefRegistration } from '../InjectReference';

/**
 * module validate.
 *
 * @export
 * @interface IModuleValidate
 */
export interface IModuleValidate {
    /**
     * is right module or not.
     *
     * @param {Type<any>} type
     * @returns {boolean}
     * @memberof IModuleValidate
     */
    validate(type: Type<any>): boolean;

    /**
     * get token of metadata.
     *
     * @param {AnnotationConfigure<any>} config
     * @returns {Token<any>}
     * @memberof IMetadataManager
     */
    getToken(config: IAnnotationMetadata<any>, container?: IContainer): Token<any>;

    /**
     * get boot token of module config.
     *
     * @param {IAnnotationMetadata<any>} cfg
     * @param {IContainer} [container]
     * @returns {Token<any>}
     * @memberof IModuleValidate
     */
    getBootToken(cfg: IAnnotationMetadata<any>, container?: IContainer): Token<any>

    /**
     * get module metadata config.
     *
     * @param {Token<any>} token
     * @param {IContainer} container
     * @returns {ClassMetadata}
     * @memberof IModuleValidate
     */
    getMetaConfig(token: Token<any>, container: IContainer, extConfig?: IAnnotationMetadata<any>): IAnnotationMetadata<any>;

    /**
     * get meta accessor.
     *
     * @param {IContainer} container
     * @returns {IMetaAccessor<any>}
     * @memberof IModuleValidate
     */
    getMetaAccessor(container: IContainer): IMetaAccessor<any>;
    /**
     * get special decorators of the module.
     *
     * @returns {(string | string[])}
     * @memberof IModuleValidate
     */
    getDecorator(): string | string[];
}


/**
 * inject module validate token for decorator or class.
 *
 * @export
 * @class InjectMetadataManagerToken
 * @extends {RefRegistration<IMetadataManager>}
 * @template T
 */
export class InjectModuleValidateToken<T extends IModuleValidate> extends RefRegistration<T> {
    constructor(type: Token<any>) {
        super(type, 'ModuleValidate');
    }
}

/**
 * Module Validate Token
 */
export const ModuleValidateToken = new InjectModuleValidateToken<IModuleValidate>(Object);
